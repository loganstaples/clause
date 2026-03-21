"use client";

import { ContractAnalysis } from "@/lib/types";
import RiskGauge from "./RiskGauge";
import ClauseCard from "./ClauseCard";

interface AnalysisPanelProps {
  analysis: ContractAnalysis;
  activeClauseId: string | null;
  onClauseClick: (clauseId: string) => void;
}

export default function AnalysisPanel({
  analysis,
  activeClauseId,
  onClauseClick,
}: AnalysisPanelProps) {
  // Sort clauses: critical first, then warning, then info
  const sortedClauses = [...analysis.clauses].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sticky summary bar */}
      <div className="shrink-0 border-b border-[rgba(255,255,255,0.06)] bg-[#0A0A0F] px-6 py-5">
        <div className="flex items-center gap-5">
          <RiskGauge score={analysis.riskScore} />
          <div className="min-w-0 flex-1">
            <h2 className="mb-2 text-sm font-semibold text-[#F1F1F3]">
              Analysis Summary
            </h2>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {analysis.counts.critical > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-[rgba(239,68,68,0.1)] px-2.5 py-1 text-xs font-medium text-[#EF4444]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                  {analysis.counts.critical} Critical
                </span>
              )}
              {analysis.counts.warning > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-[rgba(245,158,11,0.1)] px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                  {analysis.counts.warning} Warning
                </span>
              )}
              {analysis.counts.info > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.1)] px-2.5 py-1 text-xs font-medium text-[#22C55E]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                  {analysis.counts.info} Standard
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-[#8A8F98]">
              {analysis.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Clause cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {sortedClauses.map((clause, i) => (
            <ClauseCard
              key={clause.id}
              clause={clause}
              index={i}
              isActive={clause.id === activeClauseId}
              onClick={() => onClauseClick(clause.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
