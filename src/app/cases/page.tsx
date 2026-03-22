"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import FloatingAIBar from "@/components/FloatingAIBar";
import { Contract, Case, ChatMessage } from "@/lib/types";
import { getContracts, getCases } from "@/lib/store";

function scoreColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function scoreBg(score: number): string {
  if (score >= 70) return "rgba(34, 197, 94, 0.1)";
  if (score >= 40) return "rgba(245, 158, 11, 0.1)";
  return "rgba(239, 68, 68, 0.1)";
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const allContracts = getContracts();
    setContracts(allContracts);
    setCases(getCases());
  }, []);

  function getCaseContracts(c: Case): Contract[] {
    return c.contractIds
      .map((id) => contracts.find((ct) => ct.id === id))
      .filter(Boolean) as Contract[];
  }

  function getAvgScore(c: Case): number | null {
    const docs = getCaseContracts(c);
    const scored = docs.filter((d) => d.analysis != null);
    if (scored.length === 0) return null;
    const sum = scored.reduce((acc, d) => acc + (d.analysis?.riskScore ?? 0), 0);
    return Math.round(sum / scored.length);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="ml-[220px] flex-1 px-10 pt-8 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#FFFFFF]">
              Cases
            </h1>
            <p className="mt-1 text-sm text-[#5C5C5C]">
              {cases.length} case{cases.length !== 1 ? "s" : ""} &middot;{" "}
              {contracts.length} document{contracts.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>

        {/* Cases grid */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {cases.map((c) => {
            const docs = getCaseContracts(c);
            const avgScore = getAvgScore(c);

            return (
              <div
                key={c.id}
                className="group flex flex-col rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0E0E0E] p-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#131313]"
              >
                {/* Case title */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(240,235,227,0.1)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F0EBE3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#FFFFFF] truncate">
                      {c.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#5C5C5C]">
                      {docs.length === 0
                        ? "No documents"
                        : docs.length === 1
                        ? "1 document"
                        : `${docs.length} documents`}
                    </p>
                  </div>
                </div>

                {/* Document list */}
                {docs.length > 0 && (
                  <div className="mt-4 flex flex-col gap-1.5">
                    {docs.slice(0, 3).map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/case-files/${doc.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#999999] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[#cccccc]"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="truncate">{doc.name}</span>
                        {doc.analysis && (
                          <span
                            className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              color: scoreColor(doc.analysis.riskScore),
                              background: scoreBg(doc.analysis.riskScore),
                            }}
                          >
                            {doc.analysis.riskScore}
                          </span>
                        )}
                      </Link>
                    ))}
                    {docs.length > 3 && (
                      <p className="px-2 text-[11px] text-[#5C5C5C]">
                        +{docs.length - 3} more
                      </p>
                    )}
                  </div>
                )}

                {/* Footer: avg score + doc count */}
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-1.5">
                    {avgScore !== null ? (
                      <>
                        <span
                          className="text-lg font-semibold"
                          style={{ color: scoreColor(avgScore) }}
                        >
                          {avgScore}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-[#5C5C5C]">
                          Avg Score
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-[#5C5C5C]">No scores yet</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[#5C5C5C]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-xs font-medium">{docs.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {cases.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5C5C5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#FFFFFF]">No cases yet</h3>
            <p className="mt-1.5 text-sm text-[#5C5C5C]">
              Upload contracts from the{" "}
              <Link href="/" className="text-[#F0EBE3] hover:text-[#F5EFE0]">
                Dashboard
              </Link>{" "}
              and they&apos;ll be automatically grouped into cases.
            </p>
          </div>
        )}
      </main>

      <FloatingAIBar chatHistory={chatHistory} onChatUpdate={setChatHistory} />
    </div>
  );
}
