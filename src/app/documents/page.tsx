"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import FloatingAIBar from "@/components/FloatingAIBar";
import { Contract, ChatMessage } from "@/lib/types";
import { getContracts } from "@/lib/store";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileExt(name: string): string {
  if (name.toLowerCase().includes("docx") || name.toLowerCase().includes("doc")) return "DOCX";
  return "PDF";
}

export default function DocumentsPage() {
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
              Documents
            </h1>
            <p className="mt-1 text-sm text-[#5A5F6B]">
              All uploaded contracts and legal documents.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Upload
            </Link>
          </div>
        </div>

        {/* Documents table */}
        {contracts.length > 0 && (
          <div className="mt-8 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_100px_120px_60px] gap-4 border-b border-[rgba(255,255,255,0.06)] px-5 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5F6B]">Name</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5F6B]">Type</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5F6B]">Risk Score</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5F6B]">Uploaded</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5F6B]">View</span>
            </div>

            {contracts.map((contract) => (
              <Link
                key={contract.id}
                href={`/case-files/${contract.id}`}
                className="grid grid-cols-[1fr_80px_100px_120px_60px] items-center gap-4 border-b border-[rgba(255,255,255,0.04)] px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(59,130,246,0.1)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F1F1F3] truncate">{contract.name}</p>
                    {contract.contractType && (
                      <p className="text-[11px] text-[#5A5F6B]">{contract.contractType}</p>
                    )}
                  </div>
                </div>

                <span className="rounded bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] font-semibold text-[#8A8F98] w-fit">
                  {getFileExt(contract.name)}
                </span>

                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: contract.analysis.riskScore >= 70 ? "#EF4444"
                        : contract.analysis.riskScore >= 40 ? "#F59E0B"
                        : "#22C55E",
                    }}
                  >
                    {contract.analysis.riskScore}
                  </span>
                  <span className="text-[10px] text-[#5A5F6B]">/ 100</span>
                </div>

                <span className="text-xs text-[#5A5F6B]">{formatDate(contract.uploadedAt)}</span>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5F6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {contracts.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5A5F6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#F1F1F3]">No documents yet</h3>
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
