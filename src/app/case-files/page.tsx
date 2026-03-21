"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import FloatingAIBar from "@/components/FloatingAIBar";
import { Contract, ChatMessage } from "@/lib/types";
import { getContracts } from "@/lib/store";

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusBadge(contract: Contract) {
  const { analysis } = contract;
  if (analysis.counts.critical > 0) {
    return { label: "Critical Issues", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" };
  }
  if (analysis.counts.warning > 0) {
    return { label: "Warnings", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" };
  }
  return { label: "Clean", color: "#22C55E", bg: "rgba(34, 197, 94, 0.1)" };
}

export default function CaseFilesPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setContracts(getContracts());
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="ml-[220px] flex-1 px-10 pt-8 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#F1F1F3]">
              Case Files
            </h1>
            <p className="mt-1 text-sm text-[#5A5F6B]">
              {contracts.length} analyzed contract{contracts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[#8A8F98] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#c0c4cc]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22C55E] text-white text-sm font-semibold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Case files grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {contracts.map((contract) => {
            const status = getStatusBadge(contract);
            return (
              <Link
                key={contract.id}
                href={`/case-files/${contract.id}`}
                className="group rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#12131A] p-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#151620]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(59,130,246,0.1)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: status.color, background: status.bg }}
                  >
                    {status.label}
                  </span>
                </div>

                <h3 className="mt-4 text-sm font-semibold text-[#F1F1F3] group-hover:text-white">
                  {contract.name}
                </h3>
                <p className="mt-1 text-xs text-[#5A5F6B]">
                  {contract.contractType || "Contract"} &middot; {timeAgo(contract.uploadedAt)}
                </p>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-semibold text-[#F1F1F3]">{contract.analysis.riskScore}</span>
                    <span className="text-[10px] uppercase tracking-wider text-[#5A5F6B]">Risk</span>
                  </div>
                  <div className="h-4 w-px bg-[rgba(255,255,255,0.08)]" />
                  <div className="flex gap-2">
                    {contract.analysis.counts.critical > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-[#EF4444]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                        {contract.analysis.counts.critical}
                      </span>
                    )}
                    {contract.analysis.counts.warning > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-[#F59E0B]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                        {contract.analysis.counts.warning}
                      </span>
                    )}
                    {contract.analysis.counts.info > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-[#22C55E]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                        {contract.analysis.counts.info}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty state */}
        {contracts.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5A5F6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#F1F1F3]">No case files yet</h3>
            <p className="mt-1.5 text-sm text-[#5A5F6B]">
              Upload a contract from the{" "}
              <Link href="/" className="text-[#3B82F6] hover:text-[#60a5fa]">
                Dashboard
              </Link>{" "}
              to get started.
            </p>
          </div>
        )}
      </main>

      <FloatingAIBar chatHistory={chatHistory} onChatUpdate={setChatHistory} />
    </div>
  );
}
