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

  // When streaming completes, persist the analysis to the contract
  useEffect(() => {
    if (streamedAnalysis && contract && !contract.analysis) {
      const updated = { ...contract, analysis: streamedAnalysis };
      setContract(updated);
      saveContract(updated);
      if (!originalAnalysis) {
        setOriginalAnalysis({ score: streamedAnalysis.riskScore, clauses: [...streamedAnalysis.clauses] });
      }
    }
  }, [streamedAnalysis, contract]);

  const handleClauseClick = useCallback((clauseId: string) => {
    setActiveClauseId(clauseId);

    const textEl = document.getElementById(`clause-text-${clauseId}`);
    if (textEl) {
      textEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setTimeout(() => setActiveClauseId(null), 3000);
  }, []);

  const handleChatUpdate = useCallback(
    (messages: ChatMessage[]) => {
      if (!contract) return;
      const updated = { ...contract, chatHistory: messages };
      setContract(updated);
      saveContract(updated);
    },
    [contract]
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
    if (!contract || !revisionClause || !contract.analysis) return;

    const newRawText = replaceClauseText(
      contract.rawText,
      revisionClause.originalText,
      revisionClause.suggestedReplacement
    );

    // Convert the clause to a resolved info card
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
    const updatedAnalysis = {
      ...contract.analysis,
      clauses: updatedClauses,
      riskScore: recalcScore(orig.score, orig.clauses, updatedClauses),
    };

    const updated = { ...contract, rawText: newRawText, analysis: updatedAnalysis };
    setContract(updated);
    saveContract(updated);
  }, [contract, originalAnalysis]);

  if (!contract) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#F0EBE3]" />
      </div>
    );
  }

  // Determine what clauses to show — from completed analysis or from streaming
  const displayClauses = contract.analysis
    ? contract.analysis.clauses
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
