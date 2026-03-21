"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import FloatingAIBar from "@/components/FloatingAIBar";
import { ChatMessage } from "@/lib/types";

const RESEARCH_TOPICS = [
  {
    title: "Non-Compete Enforceability by State",
    desc: "Recent FTC rulings and state-by-state analysis of non-compete clause validity.",
    tag: "Employment Law",
    tagColor: "#818cf8",
  },
  {
    title: "Force Majeure Post-COVID",
    desc: "How courts have interpreted force majeure clauses since 2020 and recommended language updates.",
    tag: "Contract Law",
    tagColor: "#3B82F6",
  },
  {
    title: "AI-Generated Contract Provisions",
    desc: "Emerging legal standards around AI-drafted terms and enforceability considerations.",
    tag: "Legal Tech",
    tagColor: "#22C55E",
  },
  {
    title: "Liability Cap Benchmarks 2024",
    desc: "Industry-standard liability caps across SaaS, consulting, and service agreements.",
    tag: "Risk Analysis",
    tagColor: "#F59E0B",
  },
  {
    title: "Data Privacy Addendum Standards",
    desc: "GDPR, CCPA, and emerging state privacy law requirements for contract addenda.",
    tag: "Privacy",
    tagColor: "#EF4444",
  },
  {
    title: "Indemnification Best Practices",
    desc: "Mutual vs. one-sided indemnification and standard carve-outs in B2B agreements.",
    tag: "Contract Law",
    tagColor: "#3B82F6",
  },
];

export default function ResearchPage() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="ml-[220px] flex-1 px-10 pt-8 pb-32">
        {/* Header */}
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#F1F1F3]">
            Research
          </h1>
          <p className="mt-1 text-sm text-[#5A5F6B]">
            Legal research topics and industry benchmarks.
          </p>
        </div>

        {/* Search */}
        <div className="mt-8">
          <div className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#12131A] px-4 py-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search legal topics, benchmarks, or case law..."
              className="w-full bg-transparent text-sm text-[#F1F1F3] placeholder-[#5A5F6B] outline-none"
            />
          </div>
        </div>

        {/* Research topics grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {RESEARCH_TOPICS.map((topic) => (
            <button
              key={topic.title}
              className="group rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#12131A] p-5 text-left transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#151620]"
            >
              <div className="flex items-start justify-between">
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: topic.tagColor, background: `${topic.tagColor}18` }}
                >
                  {topic.tag}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5A5F6B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[#F1F1F3] group-hover:text-white">
                {topic.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#8A8F98]">
                {topic.desc}
              </p>
            </button>
          ))}
        </div>
      </main>

      <FloatingAIBar
        chatHistory={chatHistory}
        onChatUpdate={setChatHistory}
        placeholder="Ask a legal research question..."
      />
    </div>
  );
}
