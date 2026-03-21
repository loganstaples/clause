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
    // Find all clause positions in the text
    const matches: Array<{
      start: number;
      end: number;
      clauseId: string;
      severity: "critical" | "warning" | "info";
    }> = [];

    for (const clause of clauses) {
      // Normalize whitespace for matching
      const normalizedOriginal = clause.originalText
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      const normalizedText = text.replace(/\s+/g, " ").toLowerCase();

      const idx = normalizedText.indexOf(normalizedOriginal);
      if (idx !== -1) {
        // Map back to original text position (approximate since we normalized)
        // Find the actual position by searching in the original text around the normalized position
        const searchStart = Math.max(0, idx - 50);
        const searchEnd = Math.min(
          text.length,
          idx + normalizedOriginal.length + 50
        );
        const searchRegion = text.substring(searchStart, searchEnd);

        // Try to find the first few words in the original text
        const firstWords = clause.originalText.split(/\s+/).slice(0, 5).join("\\s+");
        const regex = new RegExp(firstWords, "i");
        const match = searchRegion.match(regex);

        if (match && match.index !== undefined) {
          const actualStart = searchStart + match.index;
          // Estimate end position
          const actualEnd = Math.min(
            text.length,
            actualStart + clause.originalText.length + 20
          );

          // Find the actual end by looking for the last few words
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

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    // Build segments
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

  // Format text into paragraphs
  const renderText = (content: string) => {
    return content.split("\n\n").map((paragraph, i) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      // Check if it's a heading (ARTICLE or all-caps line)
      const isHeading =
        /^ARTICLE\s+\d/i.test(trimmed) ||
        (trimmed === trimmed.toUpperCase() && trimmed.length < 100 && !trimmed.includes("."));

      // Check if it's a section number
      const isSection = /^\d+\.\d+/.test(trimmed);

      if (isHeading) {
        return (
          <h3
            key={i}
            className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-[#F1F1F3]"
            style={{ fontFamily: "var(--font-serif), serif" }}
          >
            {trimmed}
          </h3>
        );
      }

      return (
        <p
          key={i}
          className={`mb-3 text-sm leading-relaxed ${
            isSection ? "text-[#c0c4cc]" : "text-[#8A8F98]"
          }`}
        >
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      {segments.map((segment, i) => {
        if (segment.clauseId) {
          const isActive = segment.clauseId === activeClauseId;
          return (
            <div
              key={i}
              id={`clause-text-${segment.clauseId}`}
              className={`clause-highlight-${segment.severity} my-2 ${
                isActive ? "ring-1 ring-[rgba(59,130,246,0.3)]" : ""
              }`}
              onClick={() => onClauseClick(segment.clauseId!)}
            >
              {renderText(segment.text)}
            </div>
          );
        }
        return <div key={i}>{renderText(segment.text)}</div>;
      })}
    </div>
  );
}
