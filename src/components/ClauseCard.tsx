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
    label: "CRITICAL",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
  },
  warning: {
    label: "WARNING",
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
    <motion.div
      id={`clause-card-${clause.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={`rounded-xl border transition-all duration-200 ${
        isActive
          ? "border-[rgba(59,130,246,0.4)] ring-1 ring-[rgba(59,130,246,0.2)]"
          : "border-[rgba(255,255,255,0.06)]"
      } bg-[#12131A]`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          onClick?.();
        }}
        className="flex w-full items-start gap-3 px-5 py-4 text-left"
      >
        <span
          className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: config.color,
            backgroundColor: config.bg,
          }}
        >
          {config.label}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[#F1F1F3]">
            {clause.title}
          </h3>
          <p className="mt-0.5 text-xs text-[#5A5F6B]">{clause.location}</p>
          {!isExpanded && (
            <p className="mt-1.5 line-clamp-2 text-xs text-[#8A8F98]">
              {clause.explanation}
            </p>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5A5F6B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`mt-1 shrink-0 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
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
            <div className="border-t border-[rgba(255,255,255,0.04)] px-5 pb-5 pt-4">
              {/* Plain English explanation */}
              <p className="text-sm leading-relaxed text-[#8A8F98]">
                {clause.explanation}
              </p>

              {/* What a corporation would do */}
              <div className="mt-4 rounded-lg bg-[rgba(59,130,246,0.06)] px-4 py-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  <span className="text-xs font-semibold text-[#3B82F6]">
                    What a corporation would do
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[#8A8F98]">
                  {clause.corporateBenchmark}
                </p>
              </div>

              {/* Suggested replacement */}
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-1.5">
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
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span className="text-xs font-semibold text-[#22C55E]">
                    Suggested replacement language
                  </span>
                </div>
                <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0A0A0F] p-4">
                  <p className="text-sm leading-relaxed text-[#8A8F98]" style={{ fontFamily: "var(--font-sans)" }}>
                    &ldquo;{clause.suggestedReplacement}&rdquo;
                  </p>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-xs font-medium text-[#8A8F98] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F1F1F3]"
                  >
                    {copied ? (
                      <>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#22C55E"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
