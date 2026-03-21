"use client";

import Link from "next/link";

const TABS = [
  { label: "Case Files", href: "#", active: true },
  { label: "Documents", href: "#", active: false },
  { label: "Research", href: "#", active: false },
];

export default function CaseFilesTopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#0A0A0F] px-6">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-normal tracking-tight text-[#F1F1F3]"
          style={{ fontFamily: "var(--font-serif), serif", fontStyle: "italic" }}
        >
          Clause
        </Link>

        {/* Tabs */}
        <nav className="flex items-center gap-6">
          {TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`relative py-4 text-sm font-medium transition-colors ${
                tab.active
                  ? "text-[#3B82F6]"
                  : "text-[#8A8F98] hover:text-[#c0c4cc]"
              }`}
            >
              {tab.label}
              {tab.active && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3B82F6]" />
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Settings icon */}
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[#8A8F98] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#c0c4cc]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {/* Profile avatar */}
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[#8A8F98] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#c0c4cc]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </div>
    </header>
  );
}
