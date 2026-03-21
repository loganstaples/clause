"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContractAnalysis, Clause } from "@/lib/types";

interface CaseFileAnalysisPanelProps {
  analysis: ContractAnalysis;
  activeClauseId: string | null;
  onClauseClick: (clauseId: string) => void;
}

const severityConfig = {
  critical: {
    label: "Critical Risk",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#EF4444" fillOpacity="0.15" stroke="#EF4444" strokeWidth="1.5" />
        <line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="#EF4444" />
      </svg>
    ),
    color: "#EF4444",
    borderColor: "rgba(239, 68, 68, 0.5)",
    bgGradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, rgba(239, 68, 68, 0.01) 100%)",
  },
  warning: {
    label: "Warning",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="#F59E0B" fillOpacity="0.15" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1" fill="#F59E0B" />
      </svg>
    ),
    color: "#F59E0B",
    borderColor: "rgba(245, 158, 11, 0.5)",
    bgGradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(245, 158, 11, 0.01) 100%)",
  },
  info: {
    label: "Safe State",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#22C55E" fillOpacity="0.15" stroke="#22C55E" strokeWidth="1.5" />
        <polyline points="8 12 11 15 16 9" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: "#22C55E",
    borderColor: "rgba(34, 197, 94, 0.5)",
    bgGradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.04) 0%, rgba(34, 197, 94, 0.01) 100%)",
  },
};

function CaseFileClauseCard({
  clause,
  isActive,
  onClick,
}: {
  clause: Clause;
  isActive: boolean;
  onClick: () => void;
}) {
  const config = severityConfig[clause.severity];
  const [isExpanded, setIsExpanded] = useState(clause.severity === "critical");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(clause.suggestedReplacement);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`clause-card-${clause.id}`}
      className={`rounded-xl overflow-hidden transition-all duration-200 ${
        isActive ? "ring-1 ring-[rgba(59,130,246,0.4)]" : ""
      }`}
      style={{
        border: `1.5px solid ${config.borderColor}`,
        background: config.bgGradient,
      }}
    >
      {/* Header */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          onClick();
        }}
        className="w-full px-5 pt-4 pb-3 text-left"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <span className="text-xs font-semibold" style={{ color: config.color }}>
              {config.label}
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5A5F6B]">
            {clause.location}
          </span>
        </div>

        <h3
          className="mt-3 text-lg font-semibold text-[#F1F1F3]"
          style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
        >
          {clause.title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-[#8A8F98]">
          {clause.explanation}
        </p>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {/* Fortune 500 Benchmark */}
              {clause.severity !== "info" && (
                <div className="mt-3 rounded-lg bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.12)] px-4 py-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#3B82F6]">
                      Fortune 500 Benchmark
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#8A8F98]" style={{ fontStyle: "italic" }}>
                    &ldquo;{clause.corporateBenchmark}&rdquo;
                  </p>
                </div>
              )}

              {/* Counter-Proposal Language */}
              {clause.severity !== "info" && (
                <div className="mt-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#5A5F6B]">
                    Counter-Proposal Language
                  </p>
                  <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0A0A0F] px-4 py-3">
                    <p
                      className="text-sm leading-relaxed text-[#c0c4cc]"
                      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: "13px" }}
                    >
                      &ldquo;...{clause.suggestedReplacement}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {/* Action button */}
              {clause.severity === "critical" && (
                <button
                  onClick={handleCopy}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  {copied ? "Copied!" : "Apply Revision"}
                </button>
              )}

              {clause.severity === "warning" && (
                <button
                  onClick={onClick}
                  className="mt-3 flex items-center gap-1 text-sm font-medium text-[#3B82F6] transition-colors hover:text-[#60a5fa]"
                >
                  View Benchmarks
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CaseFileAnalysisPanel({
  analysis,
  activeClauseId,
  onClauseClick,
}: CaseFileAnalysisPanelProps) {
  const sortedClauses = [...analysis.clauses].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-[rgba(255,255,255,0.06)] px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#F1F1F3]">
            AI Analysis Cluster
          </h2>
          {analysis.counts.critical > 0 && (
            <span className="rounded-md border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-3 py-1 text-xs font-semibold text-[#EF4444]">
              {analysis.counts.critical} Critical Flag{analysis.counts.critical !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Clause cards */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-5">
          {sortedClauses.map((clause) => (
            <CaseFileClauseCard
              key={clause.id}
              clause={clause}
              isActive={clause.id === activeClauseId}
              onClick={() => onClauseClick(clause.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
