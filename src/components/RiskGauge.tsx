"use client";

import { useEffect, useState } from "react";

interface RiskGaugeProps {
  score: number;
  loading?: boolean;
}

export default function RiskGauge({ score, loading }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score, loading]);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (animatedScore / 100) * circumference;

  const color =
    score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444";

  if (loading) {
    return (
      <div className="relative inline-flex h-28 w-28 shrink-0 items-center justify-center">
        <svg className="h-28 w-28 -rotate-90 animate-pulse" viewBox="0 0 112 112">
          <circle
            cx="56"
            cy="56"
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="4"
          />
        </svg>
        <div className="absolute flex items-center justify-center">
          <div className="h-8 w-10 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-flex h-28 w-28 shrink-0 items-center justify-center">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 112 112">
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="4"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex items-center justify-center">
        <span
          className="text-4xl font-medium text-[#FFFFFF]"
          style={{ fontFamily: "var(--font-newsreader), serif" }}
        >
          {animatedScore}
        </span>
      </div>
    </div>
  );
}
