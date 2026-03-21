"use client";

import Link from "next/link";
import { Contract } from "@/lib/types";

interface CaseFilesTopBarProps {
  contract: Contract;
  isLoadingTitle?: boolean;
  onFixAll?: () => void;
  issueCount?: number;
  onExport?: () => void;
}

export default function CaseFilesTopBar({ contract, isLoadingTitle, onFixAll, issueCount, onExport }: CaseFilesTopBarProps) {
  // Derive a display title: "COMMERCIAL LEASE — 123 MAIN ST" style
  const displayTitle = contract.name
    .replace(/_/g, " ")
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#050505] px-5">
      {/* Left: back arrow + logo */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#999999] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FFFFFF]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[#FFFFFF]"
          style={{ fontFamily: "var(--font-liberation-serif), serif" }}
        >
          Clause
        </Link>
      </div>

      {/* Center: contract title */}
      {isLoadingTitle ? (
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="h-3 w-48 animate-pulse rounded bg-[rgba(255,255,255,0.08)]" />
        </div>
      ) : (
        <span className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-[0.12em] text-[#999999]">
          {displayTitle}
        </span>
      )}

      {/* Right: fix all + export */}
      <div className="flex items-center gap-2">
        {onFixAll && issueCount !== undefined && issueCount > 0 && (
          <button
            onClick={onFixAll}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#F0EBE3] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            Fix All ({issueCount})
          </button>
        )}
        <button onClick={onExport} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#999999] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#FFFFFF]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Export
        </button>
      </div>
    </header>
  );
}
