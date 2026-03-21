"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clause } from "@/lib/types";

interface ClauseCardProps {
  clause: Clause;
  index: number;
  isActive?: boolean;
  onClick?: () => void;
}

const severityConfig = {
  critical: {
    label: "CRITICAL RISK",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
  },
  warning: {
    label: "WARNING RISK",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  info: {
    label: "STANDARD",
    color: "#22C55E",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.2)",
  },
};

export default function ClauseCard({
  clause,
  index,
  isActive,
  onClick,
}: ClauseCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    clause.severity === "critical"
  );
  const [copied, setCopied] = useState(false);
  const config = severityConfig[clause.severity];

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(clause.suggestedReplacement);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.article
      id={`clause-card-${clause.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
        isActive
          ? "border-[rgba(240,235,227,0.4)] ring-1 ring-[rgba(240,235,227,0.2)]"
          : "border-white/[0.04]"
      } bg-[#141414] hover:bg-[#1A1A1A]`}
    >
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              onClick?.();
            }}
            className="text-left space-y-3"
          >
            <span
              className="inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]"
              style={{
                color: config.color,
                backgroundColor: config.bg,
                border: `1px solid ${config.border}`,
              }}
            >
              {config.label}
            </span>
            <h4
              className="text-2xl text-[#FFFFFF]"
              style={{ fontFamily: "var(--font-newsreader), serif" }}
            >
              {clause.title}
            </h4>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#999999]/50">
              {clause.location}
            </p>
          </button>
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              onClick?.();
            }}
            className="text-[#999999]/40 hover:text-white transition-colors p-1"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Explanation — always show as italic quote */}
        <p
          className="text-lg italic leading-relaxed text-[#FFFFFF]/80 opacity-90"
          style={{ fontFamily: "var(--font-newsreader), serif" }}
        >
          &ldquo;{clause.explanation}&rdquo;
        </p>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-8"
            >
              {/* Corporate Playbook */}
              <div className="rounded-xl border-l-2 border-[#F0EBE3]/40 bg-[#F0EBE3]/5 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#F0EBE3"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F0EBE3]">
                    Corporate Playbook
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[#999999]">
                  {clause.corporateBenchmark}
                </p>
              </div>

              {/* Recommended Language */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#999999]/40">
                  Recommended Language
                </label>
                <div className="group/code relative rounded-xl border border-white/[0.02] bg-black/40 p-6">
                  <p
                    className="pr-8 text-xs leading-relaxed text-[#F0EBE3]/80"
                    style={{ fontFamily: "var(--font-sans), monospace" }}
                  >
                    {clause.suggestedReplacement}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-white/[0.04] p-2 opacity-0 transition-opacity hover:bg-white/10 group-hover/code:opacity-100"
                  >
                    {copied ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#22C55E"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#999999"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Explore Strategy button when collapsed */}
        {!isExpanded && (
          <button
            onClick={() => {
              setIsExpanded(true);
              onClick?.();
            }}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.06] py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:bg-white/[0.02]"
          >
            Explore Strategy
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        )}
      </div>
    </motion.article>
  );
}
