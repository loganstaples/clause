"use client";

import Link from "next/link";
import { Contract } from "@/lib/types";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatus(contract: Contract): { label: string; color: string; bg: string } {
  const { analysis } = contract;
  if (analysis.counts.critical > 0) {
    return { label: "ANALYZED", color: "#22C55E", bg: "rgba(34, 197, 94, 0.12)" };
  }
  if (analysis.counts.warning > 0) {
    return { label: "WARNING", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)" };
  }
  return { label: "ANALYZED", color: "#22C55E", bg: "rgba(34, 197, 94, 0.12)" };
}

// Demo data for the table when no real contracts exist
const DEMO_CONTRACTS = [
  { name: "Acme_Corp_MSA_v4.pdf", status: "ANALYZED", statusColor: "#22C55E", statusBg: "rgba(34, 197, 94, 0.12)", date: "Oct 24, 2023", icon: "doc" },
  { name: "NDA_Global_Ventures.docx", status: "WARNING", statusColor: "#F59E0B", statusBg: "rgba(245, 158, 11, 0.12)", date: "Oct 22, 2023", icon: "docx" },
  { name: "Office_Lease_Agreement.pdf", status: "PROCESSING", statusColor: "#8A8F98", statusBg: "rgba(138, 143, 152, 0.12)", date: "Oct 21, 2023", icon: "doc" },
  { name: "Consulting_Contract_Final.pdf", status: "ANALYZED", statusColor: "#22C55E", statusBg: "rgba(34, 197, 94, 0.12)", date: "Oct 18, 2023", icon: "doc" },
];

interface RecentContractsTableProps {
  contracts: Contract[];
  onDemoClick?: () => void;
}

export default function RecentContractsTable({ contracts, onDemoClick }: RecentContractsTableProps) {
  const hasRealContracts = contracts.length > 0;

  return (
    <div className="flex-1">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#F1F1F3]">Recent Contracts</h2>
        <span className="text-xs text-[#5A5F6B]">Last 30 Days</span>
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_100px_50px] gap-4 border-b border-[rgba(255,255,255,0.06)] px-5 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5F6B]">Document Name</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5F6B]">Status</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5F6B]">Date</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5A5F6B]">Action</span>
        </div>

        {/* Table rows */}
        {hasRealContracts ? (
          contracts.slice(0, 5).map((contract) => {
            const status = getStatus(contract);
            return (
              <Link
                key={contract.id}
                href={`/case-files/${contract.id}`}
                className="grid grid-cols-[1fr_120px_100px_50px] items-center gap-4 border-b border-[rgba(255,255,255,0.04)] px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(59,130,246,0.1)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <span className="text-sm text-[#F1F1F3] truncate">{contract.name}</span>
                </div>
                <span
                  className="inline-flex w-fit items-center rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: status.color, background: status.bg }}
                >
                  {status.label}
                </span>
                <span className="text-xs text-[#5A5F6B]">{formatDate(contract.uploadedAt)}</span>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#5A5F6B] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#8A8F98]"
                  onClick={(e) => e.preventDefault()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
              </Link>
            );
          })
        ) : (
          DEMO_CONTRACTS.map((item, i) => (
            <div
              key={i}
              onClick={onDemoClick}
              className="grid grid-cols-[1fr_120px_100px_50px] items-center gap-4 border-b border-[rgba(255,255,255,0.04)] px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(59,130,246,0.1)]">
                  {item.icon === "docx" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-[#F1F1F3] truncate">{item.name}</span>
              </div>
              <span
                className="inline-flex w-fit items-center rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: item.statusColor, background: item.statusBg }}
              >
                {item.status}
              </span>
              <span className="text-xs text-[#5A5F6B]">{item.date}</span>
              <button className="flex h-7 w-7 items-center justify-center rounded-md text-[#5A5F6B] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#8A8F98]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
