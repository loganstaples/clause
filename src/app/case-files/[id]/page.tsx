"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import CaseFilesTopBar from "@/components/CaseFilesTopBar";
import CaseFileDocViewer from "@/components/CaseFileDocViewer";
import CaseFileAnalysisPanel from "@/components/CaseFileAnalysisPanel";
import FloatingAIBar from "@/components/FloatingAIBar";
import { Contract, ChatMessage } from "@/lib/types";
import { getContract, saveContract } from "@/lib/store";
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

  useEffect(() => {
    const c = getContract(id);
    if (!c) {
      router.push("/");
      return;
    }
    setContract(c);
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
    }
  }, [streamedAnalysis, contract]);

  const handleClauseClick = useCallback((clauseId: string) => {
    setActiveClauseId(clauseId);

    const cardEl = document.getElementById(`clause-card-${clauseId}`);
    const textEl = document.getElementById(`clause-text-${clauseId}`);

    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
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
      <CaseFilesTopBar contract={contract} isLoadingTitle={isLoadingTitle} />

      {/* Progress bar */}
      <div className={`h-[2px] w-full shrink-0 overflow-hidden transition-opacity duration-500 ${isAnalyzing ? "opacity-100" : "opacity-0"}`}>
        <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-white/80" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Document viewer — always has text, highlights appear as clauses arrive */}
        <div className="flex-1 overflow-hidden border-r border-[rgba(255,255,255,0.06)]">
          <CaseFileDocViewer
            contract={contract}
            clauses={displayClauses}
            activeClauseId={activeClauseId}
            onClauseClick={handleClauseClick}
            isLoadingTitle={isLoadingTitle}
          />
        </div>

        {/* Analysis panel — skeleton → header → clauses stream in */}
        <div className="w-[520px] shrink-0">
          <CaseFileAnalysisPanel
            analysis={contract.analysis}
            streamingHeader={streamState.header}
            streamingClauses={streamState.clauses}
            isStreaming={streamState.status === "streaming"}
            error={streamState.error}
            onRetry={() => setRetryKey((k) => k + 1)}
            activeClauseId={activeClauseId}
            onClauseClick={handleClauseClick}
          />
        </div>
      </div>

      <FloatingAIBar
        placeholder="Ask about this contract..."
        contractText={contract.rawText}
        chatHistory={contract.chatHistory}
        onChatUpdate={handleChatUpdate}
      />
    </div>
  );
}
