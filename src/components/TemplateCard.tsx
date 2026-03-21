"use client";

import { motion } from "framer-motion";

interface TemplateCardProps {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay?: number;
}

export default function TemplateCard({
  title,
  icon,
  onClick,
  delay = 0,
}: TemplateCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 + delay * 0.08 }}
      onClick={onClick}
      className="flex min-w-[140px] flex-col items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0E0E0E] px-5 py-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#131313]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(240,235,227,0.1)] text-[#F0EBE3]">
        {icon}
      </div>
      <span className="text-sm font-medium text-[#999999]">{title}</span>
    </motion.button>
  );
}
