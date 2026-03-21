"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Contract } from "@/lib/types";

function timeAgo(date: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ContractListItemProps {
  contract: Contract;
  index: number;
}

export default function ContractListItem({
  contract,
  index,
}: ContractListItemProps) {
  const { analysis } = contract;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 + index * 0.06 }}
    >
      <Link
        href={`/review/${contract.id}`}
        className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#12131A] px-5 py-4 transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#151620]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.04)]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A5F6B"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#F1F1F3]">
              {contract.name}
            </p>
            <p className="mt-0.5 text-xs text-[#5A5F6B]">
              {timeAgo(contract.uploadedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {analysis.counts.critical > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-[rgba(239,68,68,0.1)] px-2.5 py-1 text-xs font-medium text-[#EF4444]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
              {analysis.counts.critical} critical
            </span>
          )}
          {analysis.counts.warning > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-[rgba(245,158,11,0.1)] px-2.5 py-1 text-xs font-medium text-[#F59E0B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
              {analysis.counts.warning} warning
            </span>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5A5F6B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </Link>
    </motion.div>
  );
}
