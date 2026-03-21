"use client";

import { motion, AnimatePresence } from "framer-motion";
import RiskGauge from "@/components/RiskGauge";
import { ContractAnalysis, Clause } from "@/lib/types";

interface CaseFileAnalysisPanelProps {
  analysis: ContractAnalysis | null;
  streamingHeader: {
    riskScore: number;
    summary: string;
    counts: { critical: number; warning: number; info: number };
  } | null;
  streamingClauses: Clause[];
  isStreaming: boolean;
  error: string | null;
  onRetry?: () => void;
  activeClauseId: string | null;
  onClauseClick: (clauseId: string) => void;
  onRevise?: (clause: Clause) => void;
  onAskAI?: (clause: Clause) => void;
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
  onRevise,
  onAskAI,
}: {
  clause: Clause;
  isActive: boolean;
  onClick: () => void;
  onRevise?: (clause: Clause) => void;
  onAskAI?: (clause: Clause) => void;
}) {
  const severityStyles = {
    critical: {
      label: "CRITICAL",
      color: "#EF4444",
      bg: "rgba(239, 68, 68, 0.12)",
      borderColor: "rgba(239, 68, 68, 0.25)",
      cardBg: "linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, rgba(239, 68, 68, 0.01) 100%)",
    },
    warning: {
      label: "NEEDS REVIEW",
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

  // Parse location for display (e.g., "Section 4.2" → "SECTION 4.2 · PAGE 8")
  const locationDisplay = clause.location.toUpperCase();

  return (
    <div
      id={`clause-card-${clause.id}`}
      className={`rounded-xl overflow-hidden transition-all duration-200 ${
        isActive ? "ring-1 ring-[rgba(240,235,227,0.4)]" : ""
      }`}
      style={{
        border: `1px solid ${style.borderColor}`,
        background: style.cardBg,
      }}
    >
      {/* Header */}
      <button
        onClick={onClick}
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
          <div
            role="button"
            onClick={(e) => e.stopPropagation()}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#5C5C5C] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#999999]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </div>
        </div>

        <h3
          className="mt-3 text-xl font-semibold text-[#FFFFFF]"
          style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
        >
          {clause.title}
        </h3>

        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#5C5C5C]">
          {locationDisplay}
        </p>

        <p
          className="mt-3 text-sm leading-relaxed text-[#999999]"
          style={{ fontStyle: "italic" }}
        >
          &ldquo;{clause.explanation}&rdquo;
        </p>
      </button>

      {/* Card content */}
      <div className="px-5 pb-5">
        {/* What a corporation would do */}
        {clause.severity !== "info" && (
          <div className="mt-3 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
            <div className="mb-2 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#999999]">
                What a Corporation Would Do
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#999999]">
              {clause.corporateBenchmark}
            </p>
          </div>
        )}

        {/* Action buttons */}
        {clause.severity !== "info" && (
          <div className="mt-4 flex gap-2">
            {onRevise && (
              <button
                onClick={(e) => { e.stopPropagation(); onRevise(clause); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-2.5 text-sm font-medium text-[#F0EBE3] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Revise
              </button>
            )}
            {onAskAI && (
              <button
                onClick={(e) => { e.stopPropagation(); onAskAI(clause); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-2.5 text-sm font-medium text-[#F0EBE3] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Ask AI
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[rgba(255,255,255,0.06)] px-6 py-6">
        <div className="flex items-start gap-5">
          <RiskGauge score={0} loading />
          <div className="flex-1 pt-1 space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-20 animate-pulse rounded-md bg-[rgba(255,255,255,0.06)]" />
              <div className="h-6 w-20 animate-pulse rounded-md bg-[rgba(255,255,255,0.06)]" />
            </div>
            <div className="h-4 w-full animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[rgba(255,255,255,0.06)] p-5"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="h-5 w-24 rounded-md bg-[rgba(255,255,255,0.06)]" />
              <div className="mt-4 h-5 w-3/4 rounded bg-[rgba(255,255,255,0.06)]" />
              <div className="mt-2 h-4 w-1/3 rounded bg-[rgba(255,255,255,0.06)]" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-[rgba(255,255,255,0.04)]" />
                <div className="h-3 w-5/6 rounded bg-[rgba(255,255,255,0.04)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CaseFileAnalysisPanel({
  analysis,
  streamingHeader,
  streamingClauses,
  isStreaming,
  error,
  onRetry,
  activeClauseId,
  onClauseClick,
  onRevise,
  onAskAI,
}: CaseFileAnalysisPanelProps) {
  // Error state
  if (error && !analysis) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-sm text-[#999999]">Analysis failed. Please try again.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-lg bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#FFFFFF] transition-colors hover:bg-[rgba(255,255,255,0.1)]"
          >
            Retry Analysis
          </button>
        )}
      </div>
    );
  }

  // Full skeleton — no data yet
  if (!analysis && !streamingHeader) {
    return <AnalysisSkeleton />;
  }

  // Determine data source: completed analysis takes priority over streaming
  const header = analysis
    ? { riskScore: analysis.riskScore, summary: analysis.summary }
    : { riskScore: streamingHeader!.riskScore, summary: streamingHeader!.summary };
  const displayClauses = analysis
    ? [...analysis.clauses].sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      })
    : [...streamingClauses].sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      });

  // Compute counts from actual clauses, not the model's predictions
  const counts = {
    critical: displayClauses.filter((c) => c.severity === "critical").length,
    warning: displayClauses.filter((c) => c.severity === "warning").length,
    info: displayClauses.filter((c) => c.severity === "info").length,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Score overview header */}
      <div className="shrink-0 border-b border-[rgba(255,255,255,0.06)] px-6 py-6">
        <div className="flex items-start gap-5">
          <div className="shrink-0">
            <RiskGauge score={header.riskScore} />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {counts.critical > 0 && (
                <SeverityBadge count={counts.critical} label="Critical" color="#EF4444" bg="rgba(239, 68, 68, 0.1)" />
              )}
              {counts.warning > 0 && (
                <SeverityBadge count={counts.warning} label="Warning" color="#F59E0B" bg="rgba(245, 158, 11, 0.1)" />
              )}
              {counts.info > 0 && (
                <SeverityBadge count={counts.info} label="Standard" color="#22C55E" bg="rgba(34, 197, 94, 0.1)" />
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#999999]">
              {header.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Clause cards */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-5">
          <AnimatePresence mode="popLayout">
            {displayClauses.map((clause) => (
              <motion.div
                key={clause.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <CaseFileClauseCard
                  clause={clause}
                  isActive={clause.id === activeClauseId}
                  onClick={() => onClauseClick(clause.id)}
                  onRevise={onRevise}
                  onAskAI={onAskAI}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#999999]" />
              <span className="text-xs text-[#5C5C5C]">Analyzing clauses...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
