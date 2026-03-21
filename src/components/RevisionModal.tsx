"use client";

import { motion } from "framer-motion";
import { Clause } from "@/lib/types";

interface RevisionModalProps {
  clause: Clause;
  onApprove: () => void;
  onReject: () => void;
}

export default function RevisionModal({
  clause,
  onApprove,
  onReject,
}: RevisionModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onReject}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative z-10 w-[min(860px,90vw)] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(12, 12, 12, 0.98) 0%, rgba(18, 18, 18, 0.96) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow:
            "0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03) inset",
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-lg font-semibold text-white"
                style={{
                  fontFamily: "var(--font-sans), system-ui, sans-serif",
                }}
              >
                Revise: {clause.title}
              </h2>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#5C5C5C]">
                {clause.location.toUpperCase()}
              </p>
            </div>
            <button
              onClick={onReject}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5C5C5C] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#999999]"
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
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Comparison */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[#EF4444]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5C5C]">
                  Current Language
                </span>
              </div>
              <div className="rounded-lg border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.03)] px-4 py-3.5">
                <p className="text-[13px] leading-[1.8] text-[#999999]">
                  {clause.originalText}
                </p>
              </div>
            </div>

            {/* After */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[#22C55E]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5C5C]">
                  Revised Language
                </span>
              </div>
              <div className="rounded-lg border border-[rgba(34,197,94,0.15)] bg-[rgba(34,197,94,0.03)] px-4 py-3.5">
                <p className="text-[13px] leading-[1.8] text-[#cccccc]">
                  {clause.suggestedReplacement}
                </p>
              </div>
            </div>
          </div>

          {/* Explanation */}
          {clause.explanation && (
            <div className="mt-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#5C5C5C]">
                Why this revision is suggested
              </p>
              <p className="text-[13px] leading-[1.7] text-[#888888]">
                {clause.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={onReject}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#999999] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            className="rounded-lg px-5 py-2 text-sm font-semibold transition-colors"
            style={{
              background: "#22C55E",
              color: "#050505",
            }}
          >
            Approve Revision
          </button>
        </div>
      </motion.div>
    </div>
  );
}
