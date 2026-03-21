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
  const sortedClauses = [...analysis.clauses].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sticky summary header */}
      <div className="sticky top-0 z-40 shrink-0 border-b border-white/[0.04] bg-[#0B0B0B]/95 px-10 py-10 pb-8 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-12">
          <RiskGauge score={analysis.riskScore} />
          <div className="space-y-5">
            <div className="flex items-center gap-6">
              {analysis.counts.critical > 0 && (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                    {analysis.counts.critical} Critical
                  </span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                </>
              )}
              {analysis.counts.warning > 0 && (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                    {analysis.counts.warning} Warning
                  </span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                </>
              )}
              {analysis.counts.info > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-400">
                  {analysis.counts.info} Standard
                </span>
              )}
            </div>
            <p className="max-w-xl text-sm font-light leading-relaxed text-[#999999]">
              {analysis.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Clause cards */}
      <div className="flex-1 overflow-y-auto px-10 py-10 document-view">
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          {sortedClauses.map((clause, i) => (
            <ClauseCard
              key={clause.id}
              clause={clause}
              index={i}
              isActive={clause.id === activeClauseId}
              onClick={() => onClauseClick(clause.id)}
            />
          ))}
          <div className="h-40" />
        </div>
      </div>
    </div>
  );
}
