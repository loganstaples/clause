"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#F0EBE3]" />
      </div>
    );
  }

  if (!contract.analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#F0EBE3]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top header bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.04] bg-[#0B0B0B] px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-white/[0.04]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F0EBE3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span
            className="text-xl font-bold tracking-tight text-[#FFFFFF]"
            style={{ fontFamily: "var(--font-liberation-serif), serif" }}
          >
            Clause
          </span>
        </div>
        <div className="hidden md:block">
          <h1 className="text-xs font-medium uppercase tracking-[0.2em] text-[#999999]">
            {contract.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[#FFFFFF] transition-colors hover:bg-white/[0.04]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Export
          </button>
        </div>
      </header>

      {/* Two-panel layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left panel — Document viewer */}
        <div className="w-full md:w-[45%] overflow-y-auto border-r border-white/[0.04] bg-[#080808] document-view">
          <DocumentViewer
            text={contract.rawText}
            clauses={contract.analysis.clauses}
            activeClauseId={activeClauseId}
            onClauseClick={handleClauseClick}
          />
        </div>

        {/* Right panel — Analysis */}
        <div className="w-full md:w-[55%] bg-[#0B0B0B]">
          <AnalysisPanel
            analysis={contract.analysis}
            activeClauseId={activeClauseId}
            onClauseClick={handleClauseClick}
          />
        </div>
      </main>

      <FloatingAIBar
        placeholder="Ask Clause about this contract..."
        contractText={contract.rawText}
        chatHistory={contract.chatHistory}
        onChatUpdate={handleChatUpdate}
      />
    </div>
  );
}
