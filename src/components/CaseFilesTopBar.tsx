"use client";

import Link from "next/link";
import { Contract } from "@/lib/types";

interface CaseFilesTopBarProps {
  contract: Contract;
}

export default function CaseFilesTopBar({ contract }: CaseFilesTopBarProps) {
  // Derive a display title: "COMMERCIAL LEASE — 123 MAIN ST" style
  const displayTitle = contract.name
    .replace(/_/g, " ")
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#0A0A0F] px-5">
      {/* Left: back arrow + logo */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8A8F98] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F1F1F3]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <Link
          href="/"
          className="text-lg font-normal tracking-tight text-[#F1F1F3]"
          style={{ fontFamily: "var(--font-serif), serif", fontStyle: "italic" }}
        >
          Clause
        </Link>
      </div>

      {/* Center: contract title */}
      <span className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A8F98]">
        {displayTitle}
      </span>

      {/* Right: export button */}
      <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-[#8A8F98] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F1F1F3]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Export
      </button>
    </header>
  );
}
