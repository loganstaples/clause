"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import CaseFilesTopBar from "@/components/CaseFilesTopBar";
import CaseFileDocViewer from "@/components/CaseFileDocViewer";
import CaseFileAnalysisPanel from "@/components/CaseFileAnalysisPanel";
import FloatingAIBar from "@/components/FloatingAIBar";
import { Contract, ChatMessage } from "@/lib/types";
import { getContract, saveContract } from "@/lib/store";

export default function CaseFilePage({
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="ml-[220px] flex h-full flex-1 flex-col overflow-hidden">
        <CaseFilesTopBar />

        {/* Two-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Document viewer */}
          <div className="flex-1 overflow-hidden border-r border-[rgba(255,255,255,0.06)] bg-[#0A0A0F]">
            <CaseFileDocViewer
              contract={contract}
              clauses={contract.analysis.clauses}
              activeClauseId={activeClauseId}
              onClauseClick={handleClauseClick}
            />
          </div>

          {/* Analysis panel */}
          <div className="w-[420px] shrink-0 bg-[#0A0A0F]">
            <CaseFileAnalysisPanel
              analysis={contract.analysis}
              activeClauseId={activeClauseId}
              onClauseClick={handleClauseClick}
            />
          </div>
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
