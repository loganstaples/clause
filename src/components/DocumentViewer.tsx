"use client";

import { useMemo } from "react";
import { Clause } from "@/lib/types";

interface DocumentViewerProps {
  text: string;
  clauses: Clause[];
  activeClauseId: string | null;
  onClauseClick: (clauseId: string) => void;
}

interface TextSegment {
  text: string;
  clauseId: string | null;
  severity: "critical" | "warning" | "info" | null;
}

export default function DocumentViewer({
  text,
  clauses,
  activeClauseId,
  onClauseClick,
}: DocumentViewerProps) {
  const segments = useMemo(() => {
    const matches: Array<{
      start: number;
      end: number;
      clauseId: string;
      severity: "critical" | "warning" | "info";
    }> = [];

    for (const clause of clauses) {
      const normalizedOriginal = clause.originalText
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      const normalizedText = text.replace(/\s+/g, " ").toLowerCase();

      const idx = normalizedText.indexOf(normalizedOriginal);
      if (idx !== -1) {
        const searchStart = Math.max(0, idx - 50);
        const searchEnd = Math.min(
          text.length,
          idx + normalizedOriginal.length + 50
        );
        const searchRegion = text.substring(searchStart, searchEnd);

        const firstWords = clause.originalText.split(/\s+/).slice(0, 5).join("\\s+");
        const regex = new RegExp(firstWords, "i");
        const match = searchRegion.match(regex);

        if (match && match.index !== undefined) {
          const actualStart = searchStart + match.index;
          const actualEnd = Math.min(
            text.length,
            actualStart + clause.originalText.length + 20
          );

          const lastWords = clause.originalText.split(/\s+/).slice(-5).join("\\s+");
          const endRegex = new RegExp(lastWords, "i");
          const endRegion = text.substring(actualStart, actualEnd + 100);
          const endMatch = endRegion.match(endRegex);

          const finalEnd = endMatch && endMatch.index !== undefined
            ? actualStart + endMatch.index + endMatch[0].length
            : actualEnd;

          matches.push({
            start: actualStart,
            end: finalEnd,
            clauseId: clause.id,
            severity: clause.severity,
          });
        }
      }
    }

    matches.sort((a, b) => a.start - b.start);

    const result: TextSegment[] = [];
    let currentPos = 0;

    for (const match of matches) {
      if (match.start > currentPos) {
        result.push({
          text: text.substring(currentPos, match.start),
          clauseId: null,
          severity: null,
        });
      }
      if (match.start >= currentPos) {
        result.push({
          text: text.substring(match.start, match.end),
          clauseId: match.clauseId,
          severity: match.severity,
        });
        currentPos = match.end;
      }
    }

    if (currentPos < text.length) {
      result.push({
        text: text.substring(currentPos),
        clauseId: null,
        severity: null,
      });
    }

    return result;
  }, [text, clauses]);

  const renderText = (content: string, dimmed: boolean) => {
    return content.split("\n\n").map((paragraph, i) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      const isHeading =
        /^ARTICLE\s+\d/i.test(trimmed) ||
        (trimmed === trimmed.toUpperCase() && trimmed.length < 100 && !trimmed.includes("."));

      const isSection = /^\d+\.\d+/.test(trimmed);

      if (isHeading) {
        return (
          <h3
            key={i}
            className={`mb-4 mt-10 text-xl italic ${dimmed ? "text-[#FFFFFF]/60" : "text-[#FFFFFF]"}`}
            style={{ fontFamily: "var(--font-newsreader), serif" }}
          >
            {trimmed}
          </h3>
        );
      }

      return (
        <p
          key={i}
          className={`mb-4 text-lg leading-[1.75] ${
            dimmed
              ? isSection ? "text-[#FFFFFF]/60" : "text-[#FFFFFF]/60"
              : "text-[#FFFFFF]/90"
          }`}
          style={{ fontFamily: "var(--font-newsreader), serif" }}
        >
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-8 md:px-12 lg:px-20">
      <div className="mx-auto max-w-xl space-y-6">
        {segments.map((segment, i) => {
          if (segment.clauseId) {
            const isActive = segment.clauseId === activeClauseId;
            const borderColor =
              segment.severity === "critical"
                ? "bg-red-500/60 group-hover:bg-red-500"
                : segment.severity === "warning"
                ? "bg-amber-500/60 group-hover:bg-amber-500"
                : "bg-green-500/60 group-hover:bg-green-500";
            const bgColor =
              segment.severity === "critical"
                ? "bg-red-500/[0.03]"
                : segment.severity === "warning"
                ? "bg-amber-500/[0.03]"
                : "bg-green-500/[0.03]";

            return (
              <div
                key={i}
                id={`clause-text-${segment.clauseId}`}
                className={`group relative cursor-pointer ${
                  isActive ? "ring-1 ring-[rgba(240,235,227,0.3)]" : ""
                }`}
                onClick={() => onClauseClick(segment.clauseId!)}
              >
                <div className={`absolute -left-8 top-0 bottom-0 w-[2px] rounded-full transition-all ${borderColor}`} />
                <div className={`${bgColor} rounded-r-xl p-6 -mx-6`}>
                  {renderText(segment.text, false)}
                </div>
              </div>
            );
          }
          return (
            <div key={i}>
              {renderText(segment.text, true)}
            </div>
          );
        })}
        <div className="h-48" />
      </div>
    </div>
  );
}
