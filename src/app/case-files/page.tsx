"use client";

import { useState, useEffect, useMemo } from "react";
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
  if (!contract.analysis) {
    return { label: "Analyzing...", color: "#999999", bg: "rgba(153, 153, 153, 0.1)" };
  }
  const { analysis } = contract;
  if (analysis.counts.critical > 0) {
    return { label: "Critical Issues", color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)" };
  }
  if (analysis.counts.warning > 0) {
    return { label: "Warnings", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" };
  }
  return { label: "Clean", color: "#22C55E", bg: "rgba(34, 197, 94, 0.1)" };
}

interface CaseGroup {
  counterparty: string;
  contracts: Contract[];
  worstScore: number | null;
  totalIssues: number;
}

function ContractCard({ contract }: { contract: Contract }) {
  const status = getStatusBadge(contract);
  return (
    <Link
      href={`/case-files/${contract.id}`}
      className="group rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0E0E0E] p-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#131313]"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(240,235,227,0.1)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0EBE3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

      <h3 className="mt-4 text-sm font-semibold text-[#FFFFFF] group-hover:text-white">
        {contract.name}
      </h3>
      <p className="mt-1 text-xs text-[#5C5C5C]">
        {contract.contractType || "Contract"} &middot; {timeAgo(contract.uploadedAt)}
      </p>

      {contract.analysis ? (
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-semibold text-[#FFFFFF]">{contract.analysis.riskScore}</span>
            <span className="text-[10px] uppercase tracking-wider text-[#5C5C5C]">Score</span>
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
      ) : (
        <div className="mt-4 flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#999999]" />
          <span className="text-xs text-[#5C5C5C]">Analyzing...</span>
        </div>
      )}
    </Link>
  );
}

export default function CaseFilesPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    setContracts(getContracts());
  }, []);

  const groups = useMemo((): CaseGroup[] => {
    const map = new Map<string, Contract[]>();
    for (const c of contracts) {
      const key = c.analysis?.counterparty || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries())
      .map(([counterparty, groupContracts]) => {
        const scores = groupContracts
          .filter((c) => c.analysis)
          .map((c) => c.analysis!.riskScore);
        const totalIssues = groupContracts.reduce((sum, c) => {
          if (!c.analysis) return sum;
          return sum + c.analysis.counts.critical + c.analysis.counts.warning;
        }, 0);
        return {
          counterparty,
          contracts: groupContracts,
          worstScore: scores.length > 0 ? Math.min(...scores) : null,
          totalIssues,
        };
      })
      .sort((a, b) => {
        // Uncategorized always last
        if (a.counterparty === "Uncategorized") return 1;
        if (b.counterparty === "Uncategorized") return -1;
        // Sort by most contracts first
        return b.contracts.length - a.contracts.length;
      });
  }, [contracts]);

  const toggleGroup = (counterparty: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(counterparty)) next.delete(counterparty);
      else next.add(counterparty);
      return next;
    });
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return "#22C55E";
    if (score >= 40) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="ml-[220px] flex-1 px-10 pt-8 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#FFFFFF]">
              Case Files
            </h1>
            <p className="mt-1 text-sm text-[#5C5C5C]">
              {groups.length} case{groups.length !== 1 ? "s" : ""} &middot; {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Grouped case files */}
        <div className="mt-8 space-y-6">
          {groups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.counterparty);
            return (
              <div
                key={group.counterparty}
                className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)]"
              >
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.counterparty)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                >
                  <div className="flex items-center gap-3">
                    {/* Folder icon */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(240,235,227,0.08)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0EBE3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[#FFFFFF]">
                        {group.counterparty}
                      </h2>
                      <p className="text-[11px] text-[#5C5C5C]">
                        {group.contracts.length} contract{group.contracts.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {group.totalIssues > 0 && (
                      <span className="text-[11px] font-medium text-[#F59E0B]">
                        {group.totalIssues} issue{group.totalIssues !== 1 ? "s" : ""}
                      </span>
                    )}
                    {group.worstScore !== null && (
                      <span
                        className="text-sm font-semibold"
                        style={{ color: scoreColor(group.worstScore) }}
                      >
                        {group.worstScore}
                      </span>
                    )}
                    {/* Chevron */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#5C5C5C"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {/* Contracts grid */}
                {!isCollapsed && (
                  <div className="border-t border-[rgba(255,255,255,0.04)] px-4 py-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                      {group.contracts.map((contract) => (
                        <ContractCard key={contract.id} contract={contract} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {contracts.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5C5C5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#FFFFFF]">No case files yet</h3>
            <p className="mt-1.5 text-sm text-[#5C5C5C]">
              Upload a contract from the{" "}
              <Link href="/" className="text-[#F0EBE3] hover:text-[#F5EFE0]">
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
