"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RiskGauge from "@/components/RiskGauge";
import { ContractAnalysis, Clause } from "@/lib/types";

interface CaseFileAnalysisPanelProps {
  analysis: ContractAnalysis;
  activeClauseId: string | null;
  onClauseClick: (clauseId: string) => void;
}

function SeverityBadge({
  count,
  label,
  color,
  bg,
}: {
  count: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
      style={{ color, backgroundColor: bg }}
    >
      {count} {label}
    </span>
  );
}

function CaseFileClauseCard({
  clause,
  isActive,
  onClick,
}: {
  clause: Clause;
  isActive: boolean;
  onClick: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(clause.severity === "critical");
  const [copied, setCopied] = useState(false);

  const severityStyles = {
    critical: {
      label: "CRITICAL RISK",
      color: "#EF4444",
      bg: "rgba(239, 68, 68, 0.12)",
      borderColor: "rgba(239, 68, 68, 0.25)",
      cardBg: "linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, rgba(239, 68, 68, 0.01) 100%)",
    },
    warning: {
      label: "WARNING RISK",
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.12)",
      borderColor: "rgba(245, 158, 11, 0.25)",
      cardBg: "linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(245, 158, 11, 0.01) 100%)",
    },
    info: {
      label: "STANDARD",
      color: "#22C55E",
      bg: "rgba(34, 197, 94, 0.12)",
      borderColor: "rgba(34, 197, 94, 0.25)",
      cardBg: "linear-gradient(135deg, rgba(34, 197, 94, 0.04) 0%, rgba(34, 197, 94, 0.01) 100%)",
    },
  };

  const style = severityStyles[clause.severity];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(clause.suggestedReplacement);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse location for display (e.g., "Section 4.2" → "SECTION 4.2 · PAGE 8")
  const locationDisplay = clause.location.toUpperCase();

  return (
    <div
      id={`clause-card-${clause.id}`}
      className={`rounded-xl overflow-hidden transition-all duration-200 ${
        isActive ? "ring-1 ring-[rgba(59,130,246,0.4)]" : ""
      }`}
      style={{
        border: `1px solid ${style.borderColor}`,
        background: style.cardBg,
      }}
    >
      {/* Header */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          onClick();
        }}
        className="w-full px-5 pt-5 pb-3 text-left"
      >
        <div className="flex items-start justify-between">
          {/* Severity badge */}
          <span
            className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{
              color: style.color,
              backgroundColor: style.bg,
            }}
          >
            {style.label}
          </span>

          {/* Three-dot menu */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#5A5F6B] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#8A8F98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>

        <h3
          className="mt-3 text-xl font-semibold text-[#F1F1F3]"
          style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
        >
          {clause.title}
        </h3>

        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#5A5F6B]">
          {locationDisplay}
        </p>

        <p
          className="mt-3 text-sm leading-relaxed text-[#8A8F98]"
          style={{ fontStyle: "italic" }}
        >
          &ldquo;{clause.explanation}&rdquo;
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
              {/* Corporate Playbook */}
              {clause.severity !== "info" && (
                <div className="mt-3 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8F98" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A8F98]">
                      Corporate Playbook
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[#8A8F98]">
                    {clause.corporateBenchmark}
                  </p>
                </div>
              )}

              {/* Recommended Language */}
              {clause.severity !== "info" && (
                <div className="mt-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#5A5F6B]">
                    Recommended Language
                  </p>
                  <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0A0A0F] px-4 py-3.5">
                    <p
                      className="text-[13px] leading-relaxed text-[#c0c4cc]"
                      style={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      }}
                    >
                      {clause.suggestedReplacement}
                    </p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#5A5F6B] transition-colors hover:text-[#8A8F98]"
                  >
                    {copied ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy to clipboard
                      </>
                    )}
                  </button>
                </div>
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
      {/* Risk overview header */}
      <div className="shrink-0 border-b border-[rgba(255,255,255,0.06)] px-6 py-6">
        <div className="flex items-start gap-5">
          {/* Risk gauge */}
          <div className="shrink-0">
            <RiskGauge score={analysis.riskScore} />
          </div>

          {/* Badges + summary */}
          <div className="flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {analysis.counts.critical > 0 && (
                <SeverityBadge
                  count={analysis.counts.critical}
                  label="Critical"
                  color="#EF4444"
                  bg="rgba(239, 68, 68, 0.1)"
                />
              )}
              {analysis.counts.warning > 0 && (
                <SeverityBadge
                  count={analysis.counts.warning}
                  label="Warning"
                  color="#F59E0B"
                  bg="rgba(245, 158, 11, 0.1)"
                />
              )}
              {analysis.counts.info > 0 && (
                <SeverityBadge
                  count={analysis.counts.info}
                  label="Standard"
                  color="#22C55E"
                  bg="rgba(34, 197, 94, 0.1)"
                />
              )}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-[#8A8F98]">
              {analysis.summary}
            </p>
          </div>
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
