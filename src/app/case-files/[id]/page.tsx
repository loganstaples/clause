"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import CaseFilesTopBar from "@/components/CaseFilesTopBar";
import CaseFileDocViewer from "@/components/CaseFileDocViewer";
import CaseFileAnalysisPanel from "@/components/CaseFileAnalysisPanel";
import FloatingAIBar from "@/components/FloatingAIBar";
import RevisionModal from "@/components/RevisionModal";
import { Contract, ChatMessage, Clause } from "@/lib/types";
import { getContract, saveContract } from "@/lib/store";
import PDFPreviewModal from "@/components/PDFPreviewModal";
import { useStreamingAnalysis } from "@/lib/use-streaming-analysis";

export default function CaseFilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedParagraph, setSelectedParagraph] = useState<string | null>(null);
  const [revisionClause, setRevisionClause] = useState<Clause | null>(null);
  const [originalAnalysis, setOriginalAnalysis] = useState<{ score: number; clauses: Clause[] } | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [resummarizing, setResummarizing] = useState(false);
  const [streamingApprovals, setStreamingApprovals] = useState<Map<string, Clause>>(new Map());

  useEffect(() => {
    const c = getContract(id);
    if (!c) {
      router.push("/");
      return;
    }
    setContract(c);
    if (c.analysis && !originalAnalysis) {
      setOriginalAnalysis({ score: c.analysis.riskScore, clauses: [...c.analysis.clauses] });
    }
  }, [id, router]);

  // Stream analysis if contract has no analysis yet
  const needsAnalysis = contract !== null && contract.analysis === null;
  const { state: streamState, analysis: streamedAnalysis } =
    useStreamingAnalysis(
      needsAnalysis ? contract.rawText : null,
      needsAnalysis,
      retryKey
    );

  // When AI title arrives, update the contract name
  useEffect(() => {
    if (streamState.title && contract && contract.analysis === null) {
      const updated = { ...contract, name: streamState.title };
      setContract(updated);
      saveContract(updated);
    }
  }, [streamState.title]);

  // When streaming completes, persist the analysis (with any mid-stream approvals applied)
  useEffect(() => {
    if (!streamedAnalysis) return;

    setContract((prev) => {
      if (!prev || prev.analysis) return prev;

      let newRawText = prev.rawText;
      let finalClauses = streamedAnalysis.clauses;

      // Apply revisions that were approved while streaming was in progress
      if (streamingApprovals.size > 0) {
        for (const [, clause] of streamingApprovals) {
          newRawText = replaceClauseText(newRawText, clause.originalText, clause.suggestedReplacement);
        }
        finalClauses = finalClauses.map((c) =>
          streamingApprovals.has(c.id)
            ? {
                ...c,
                severity: "info" as const,
                originalText: streamingApprovals.get(c.id)!.suggestedReplacement,
                explanation: "Revised — this clause now uses more favorable language.",
              }
            : c
        );
      }

      const analysis = {
        ...streamedAnalysis,
        clauses: finalClauses,
        riskScore: streamingApprovals.size > 0
          ? recalcScore(streamedAnalysis.riskScore, streamedAnalysis.clauses, finalClauses)
          : streamedAnalysis.riskScore,
      };

      const updated = { ...prev, rawText: newRawText, analysis };
      saveContract(updated);
      return updated;
    });

    if (!originalAnalysis) {
      setOriginalAnalysis({ score: streamedAnalysis.riskScore, clauses: [...streamedAnalysis.clauses] });
    }
    if (streamingApprovals.size > 0) {
      setStreamingApprovals(new Map());
    }
  }, [streamedAnalysis]);

  const handleClauseClick = useCallback((clauseId: string) => {
    setActiveClauseId(clauseId);

    // Smooth scroll helper
    const smoothScroll = (container: HTMLElement, target: number) => {
      const start = container.scrollTop;
      const distance = target - start;
      const duration = 250;
      const startTime = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = t * (2 - t);
        container.scrollTop = start + distance * ease;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    // Scroll the clause card into view in the analysis panel
    const cardEl = document.getElementById(`clause-card-${clauseId}`);
    if (cardEl) {
      const scrollContainer = cardEl.closest(".overflow-y-auto") as HTMLElement | null;
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const cardRect = cardEl.getBoundingClientRect();
        smoothScroll(scrollContainer, cardRect.top - containerRect.top + scrollContainer.scrollTop - 16);
      }
    }

    // Scroll the clause text into view in the doc viewer
    const textEl = document.getElementById(`clause-text-${clauseId}`);
    if (textEl) {
      const scrollContainer = textEl.closest(".overflow-y-auto") as HTMLElement | null;
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const textRect = textEl.getBoundingClientRect();
        smoothScroll(scrollContainer, textRect.top - containerRect.top + scrollContainer.scrollTop - 16);
      }
    }

    setTimeout(() => setActiveClauseId(null), 3000);
  }, []);

  const handleChatUpdate = useCallback(
    (messages: ChatMessage[]) => {
      setContract((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, chatHistory: messages };
        saveContract(updated);
        return updated;
      });
    },
    []
  );

  // Replace clause text in rawText using exact or fuzzy matching
  const replaceClauseText = (rawText: string, original: string, replacement: string): string => {
    if (rawText.includes(original)) {
      return rawText.replace(original, replacement);
    }
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
    const normalizedOriginal = normalize(original);
    const normalizedFull = normalize(rawText);
    const idx = normalizedFull.indexOf(normalizedOriginal);
    if (idx === -1) return rawText;

    let realStart = 0;
    let normIdx = 0;
    while (normIdx < idx && realStart < rawText.length) {
      if (/\s/.test(rawText[realStart])) {
        while (realStart < rawText.length && /\s/.test(rawText[realStart])) realStart++;
        normIdx++;
      } else {
        realStart++;
        normIdx++;
      }
    }
    let realEnd = realStart;
    let matchLen = 0;
    while (matchLen < normalizedOriginal.length && realEnd < rawText.length) {
      if (/\s/.test(rawText[realEnd])) {
        while (realEnd < rawText.length && /\s/.test(rawText[realEnd])) realEnd++;
        matchLen++;
      } else {
        realEnd++;
        matchLen++;
      }
    }
    return rawText.substring(0, realStart) + replacement + rawText.substring(realEnd);
  };

  // Recalculate favorability score: starts from the AI's original score
  // and scales toward 100 as issues are resolved
  const recalcScore = (originalScore: number, originalClauses: Clause[], updatedClauses: Clause[]): number => {
    const originalIssues = originalClauses.filter((c) => c.severity === "critical" || c.severity === "warning").length;
    const remainingIssues = updatedClauses.filter((c) => c.severity === "critical" || c.severity === "warning").length;
    if (originalIssues === 0) return originalScore;
    if (remainingIssues === 0) return 100;
    const fixedRatio = (originalIssues - remainingIssues) / originalIssues;
    const scoreGap = 100 - originalScore;
    return Math.round(originalScore + scoreGap * fixedRatio);
  };

  const handleApproveRevision = useCallback(() => {
    if (!contract || !revisionClause) return;

    if (contract.analysis) {
      // Analysis complete — apply revision immediately
      const newRawText = replaceClauseText(
        contract.rawText,
        revisionClause.originalText,
        revisionClause.suggestedReplacement
      );

      const updatedClauses = contract.analysis.clauses.map((c) =>
        c.id === revisionClause.id
          ? {
              ...c,
              severity: "info" as const,
              originalText: revisionClause.suggestedReplacement,
              explanation: "Revised — this clause now uses more favorable language.",
            }
          : c
      );
      const orig = originalAnalysis ?? { score: contract.analysis.riskScore, clauses: contract.analysis.clauses };
      const updatedAnalysis = {
        ...contract.analysis,
        clauses: updatedClauses,
        riskScore: recalcScore(orig.score, orig.clauses, updatedClauses),
      };

      const updated = { ...contract, rawText: newRawText, analysis: updatedAnalysis };
      setContract(updated);
      saveContract(updated);
    } else {
      // Still streaming — defer text replacement, track approval to apply when done
      setStreamingApprovals((prev) => new Map(prev).set(revisionClause.id, revisionClause));
    }

    setRevisionClause(null);
  }, [contract, revisionClause, originalAnalysis]);

  const handleFixAll = useCallback(() => {
    if (!contract?.analysis) return;

    const fixableClauses = contract.analysis.clauses.filter(
      (c) => c.severity !== "info" && c.suggestedReplacement
    );
    if (fixableClauses.length === 0) return;

    let newRawText = contract.rawText;
    for (const clause of fixableClauses) {
      newRawText = replaceClauseText(newRawText, clause.originalText, clause.suggestedReplacement);
    }

    // Convert all fixed clauses to resolved info cards
    const fixableIds = new Set(fixableClauses.map((c) => c.id));
    const updatedClauses = contract.analysis.clauses.map((c) =>
      fixableIds.has(c.id)
        ? {
            ...c,
            severity: "info" as const,
            originalText: c.suggestedReplacement,
            explanation: "Revised — this clause now uses more favorable language.",
          }
        : c
    );
    const orig = originalAnalysis ?? { score: contract.analysis.riskScore, clauses: contract.analysis.clauses };
    const newScore = recalcScore(orig.score, orig.clauses, updatedClauses);
    const updatedAnalysis = {
      ...contract.analysis,
      clauses: updatedClauses,
      riskScore: newScore,
    };

    const updated = { ...contract, rawText: newRawText, analysis: updatedAnalysis };
    setContract(updated);
    saveContract(updated);

    // Regenerate summary to reflect the revised contract
    setResummarizing(true);
    fetch("/api/resummarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractText: newRawText, riskScore: newScore }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          setContract((prev) => {
            if (!prev?.analysis) return prev;
            const withSummary = {
              ...prev,
              analysis: { ...prev.analysis, summary: data.summary },
            };
            saveContract(withSummary);
            return withSummary;
          });
        }
      })
      .catch(() => {
        // Keep existing summary on failure
      })
      .finally(() => {
        setResummarizing(false);
      });
  }, [contract, originalAnalysis]);

  if (!contract) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#F0EBE3]" />
      </div>
    );
  }

  // Determine what clauses to show — from completed analysis or from streaming
  // During streaming, mark any mid-stream approved clauses as resolved
  const displayClauses = contract.analysis
    ? contract.analysis.clauses
    : streamingApprovals.size > 0
      ? streamState.clauses.map((c) =>
          streamingApprovals.has(c.id)
            ? {
                ...c,
                severity: "info" as const,
                originalText: streamingApprovals.get(c.id)!.suggestedReplacement,
                explanation: "Revised — this clause now uses more favorable language.",
              }
            : c
        )
      : streamState.clauses;

  const isLoadingTitle = needsAnalysis && !streamState.title;

  const isAnalyzing = streamState.status === "streaming";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#050505]">
      <CaseFilesTopBar
        contract={contract}
        isLoadingTitle={isLoadingTitle}
        onFixAll={handleFixAll}
        issueCount={contract.analysis ? contract.analysis.clauses.filter((c) => c.severity !== "info" && c.suggestedReplacement).length : 0}
        onExport={() => setShowPDFPreview(true)}
      />

      {/* Progress bar */}
      <div className={`h-[2px] w-full shrink-0 overflow-hidden transition-opacity duration-500 ${isAnalyzing ? "opacity-100" : "opacity-0"}`}>
        {isAnalyzing && (
          <div className="h-full animate-[progress-grow_60s_ease-out_forwards] bg-white/80" />
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Analysis panel — skeleton → header → clauses stream in */}
        <div className="w-[520px] shrink-0 border-r border-[rgba(255,255,255,0.06)]">
          <CaseFileAnalysisPanel
            analysis={contract.analysis}
            streamingHeader={streamState.header}
            streamingClauses={streamState.clauses}
            isStreaming={streamState.status === "streaming"}
            error={streamState.error}
            onRetry={() => setRetryKey((k) => k + 1)}
            activeClauseId={activeClauseId}
            onClauseClick={handleClauseClick}
            onRevise={setRevisionClause}
            onAskAI={(clause) => setSelectedParagraph(clause.originalText)}
            resummarizing={resummarizing}
          />
        </div>

        {/* Document viewer — always has text, highlights appear as clauses arrive */}
        <div className="flex-1 overflow-hidden">
          <CaseFileDocViewer
            contract={contract}
            clauses={displayClauses}
            activeClauseId={activeClauseId}
            onClauseClick={handleClauseClick}
            onParagraphClick={setSelectedParagraph}
            isLoadingTitle={isLoadingTitle}
          />
        </div>
      </div>

      <FloatingAIBar
        placeholder="Ask about this contract..."
        contractText={contract.rawText}
        chatHistory={contract.chatHistory}
        onChatUpdate={handleChatUpdate}
        contextParagraph={selectedParagraph}
        onClearContext={() => setSelectedParagraph(null)}
        onFixAll={handleFixAll}
        onExport={() => setShowPDFPreview(true)}
      />

      <AnimatePresence>
        {revisionClause && (
          <RevisionModal
            clause={revisionClause}
            onApprove={handleApproveRevision}
            onReject={() => setRevisionClause(null)}
          />
        )}
        {showPDFPreview && (
          <PDFPreviewModal
            contract={contract}
            originalClauses={originalAnalysis?.clauses ?? []}
            onClose={() => setShowPDFPreview(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
