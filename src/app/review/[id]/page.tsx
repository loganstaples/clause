"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import DocumentViewer from "@/components/DocumentViewer";
import AnalysisPanel from "@/components/AnalysisPanel";
import FloatingAIBar from "@/components/FloatingAIBar";
import { Contract, ChatMessage } from "@/lib/types";
import { getContract, saveContract } from "@/lib/store";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);

  useEffect(() => {
    const c = getContract(id);
    if (!c) {
      router.push("/");
      return;
    }
    setContract(c);
  }, [id, router]);

  const handleClauseClick = useCallback((clauseId: string) => {
    setActiveClauseId(clauseId);

    // Scroll the corresponding element into view
    const cardEl = document.getElementById(`clause-card-${clauseId}`);
    const textEl = document.getElementById(`clause-text-${clauseId}`);

    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (textEl) {
      textEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Clear active state after a moment
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#0A0A0F] px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-[#8A8F98] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F1F1F3]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </Link>
          <div className="h-4 w-px bg-[rgba(255,255,255,0.08)]" />
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A5F6B"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="text-sm font-medium text-[#F1F1F3]">
              {contract.name}
            </span>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Document viewer */}
        <div className="w-1/2 overflow-y-auto border-r border-[rgba(255,255,255,0.06)] bg-[#0A0A0F]">
          <DocumentViewer
            text={contract.rawText}
            clauses={contract.analysis.clauses}
            activeClauseId={activeClauseId}
            onClauseClick={handleClauseClick}
          />
        </div>

        {/* Right panel — Analysis */}
        <div className="w-1/2 bg-[#0A0A0F]">
          <AnalysisPanel
            analysis={contract.analysis}
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
