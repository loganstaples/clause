"use client";

import { useEffect, useState } from "react";

interface RiskGaugeProps {
  score: number;
}

export default function RiskGauge({ score }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset =
    circumference - (animatedScore / 100) * circumference;

  const color =
    score >= 70 ? "#EF4444" : score >= 40 ? "#F59E0B" : "#22C55E";

  return (
    <div className="relative inline-flex h-28 w-28 items-center justify-center">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="text-2xl font-semibold"
          style={{ color }}
        >
          {animatedScore}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#5A5F6B]">
          Risk
        </span>
      </div>
    </div>
  );
}
