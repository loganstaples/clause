"use client";

import { useMemo } from "react";
import { Clause, Contract } from "@/lib/types";

interface CaseFileDocViewerProps {
  contract: Contract;
  clauses: Clause[];
  activeClauseId: string | null;
  onClauseClick: (clauseId: string) => void;
}

interface TextSegment {
  text: string;
  clauseId: string | null;
  severity: "critical" | "warning" | "info" | null;
}

export default function CaseFileDocViewer({
  contract,
  clauses,
  activeClauseId,
  onClauseClick,
}: CaseFileDocViewerProps) {
  const text = contract.rawText;

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
        const searchEnd = Math.min(text.length, idx + normalizedOriginal.length + 50);
        const searchRegion = text.substring(searchStart, searchEnd);

        const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const firstWords = clause.originalText.split(/\s+/).slice(0, 5).map(escapeRegex).join("\\s+");
        const regex = new RegExp(firstWords, "i");
        const match = searchRegion.match(regex);

        if (match && match.index !== undefined) {
          const actualStart = searchStart + match.index;
          const actualEnd = Math.min(text.length, actualStart + clause.originalText.length + 20);

          const lastWords = clause.originalText.split(/\s+/).slice(-5).map(escapeRegex).join("\\s+");
          const endRegex = new RegExp(lastWords, "i");
          const endRegion = text.substring(actualStart, actualEnd + 100);
          const endMatch = endRegion.match(endRegex);

          const finalEnd =
            endMatch && endMatch.index !== undefined
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
        result.push({ text: text.substring(currentPos, match.start), clauseId: null, severity: null });
      }
      if (match.start >= currentPos) {
        result.push({ text: text.substring(match.start, match.end), clauseId: match.clauseId, severity: match.severity });
        currentPos = match.end;
      }
    }

    if (currentPos < text.length) {
      result.push({ text: text.substring(currentPos), clauseId: null, severity: null });
    }

    return result;
  }, [text, clauses]);

  const renderText = (content: string) => {
    return content.split("\n\n").map((paragraph, i) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      const isHeading =
        /^ARTICLE\s+\d/i.test(trimmed) ||
        (trimmed === trimmed.toUpperCase() && trimmed.length < 100 && !trimmed.includes("."));

      // Detect section headers like "Section 2.0: Indemnification"
      const isSectionHeader = /^\d+\.\d+\s+[A-Z]/.test(trimmed) || /^Section\s+\d/i.test(trimmed);
      const isNumberedSection = /^\d+\.\s+[A-Z]/.test(trimmed);

      if (isHeading) {
        return (
          <h3
            key={i}
            className="mb-4 mt-10 text-sm font-bold uppercase tracking-wide text-[#F1F1F3]"
          >
            {trimmed}
          </h3>
        );
      }

      if (isSectionHeader || isNumberedSection) {
        const match = trimmed.match(/^((?:\d+\.\d*\s*|Section\s+[\d.]+[:\s]*))(.+)/i);
        if (match) {
          const [, prefix, rest] = match;
          // Check for "Title. Body" pattern
          const titleMatch = rest.match(/^([^.]+\.)\s*([\s\S]*)/);
          if (titleMatch) {
            const [, title, body] = titleMatch;
            return (
              <p
                key={i}
                className="mb-4 text-base leading-[1.8] text-[#c0c4cc]"
                style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
              >
                <em className="text-[#F1F1F3]">{prefix}{title}</em>{" "}
                {body}
              </p>
            );
          }
          return (
            <p
              key={i}
              className="mb-4 text-base leading-[1.8] text-[#c0c4cc]"
              style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
            >
              <em className="text-[#F1F1F3]">{trimmed}</em>
            </p>
          );
        }
      }

      return (
        <p
          key={i}
          className="mb-4 text-base leading-[1.8] text-[#c0c4cc]"
          style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
        >
          {trimmed}
        </p>
      );
    });
  };

  const borderColors = {
    critical: "border-l-[#EF4444] bg-[rgba(239,68,68,0.04)]",
    warning: "border-l-[#F59E0B] bg-[rgba(245,158,11,0.04)]",
    info: "border-l-[#22C55E] bg-[rgba(34,197,94,0.03)]",
  };

  // Derive clean display name
  const displayName = contract.name
    .replace(/_/g, " ")
    .replace(/\s*v\d+$/i, "")
    .replace(/—.*$/, "")
    .trim();

  return (
    <div className="h-full overflow-y-auto">
      {/* Document header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] px-12 pt-10 pb-8">
        <h1
          className="text-4xl font-normal leading-tight text-[#F1F1F3]"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          {displayName}
        </h1>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5A5F6B]">
          Draft Revision 4.2
        </p>
      </div>

      {/* Document body */}
      <div className="px-12 py-8 pb-40">
        {segments.map((segment, i) => {
          if (segment.clauseId) {
            const isActive = segment.clauseId === activeClauseId;
            return (
              <div
                key={i}
                id={`clause-text-${segment.clauseId}`}
                className={`my-2 cursor-pointer rounded-r-lg border-l-3 pl-5 py-2 transition-all duration-200 ${
                  borderColors[segment.severity!]
                } ${isActive ? "ring-1 ring-[rgba(59,130,246,0.3)]" : ""}`}
                onClick={() => onClauseClick(segment.clauseId!)}
              >
                {renderText(segment.text)}
              </div>
            );
          }
          return <div key={i}>{renderText(segment.text)}</div>;
        })}
      </div>
    </div>
  );
}
