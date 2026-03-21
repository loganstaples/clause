"use client";

import { useMemo } from "react";
import { Clause, Contract } from "@/lib/types";

interface CaseFileDocViewerProps {
  contract: Contract;
  clauses: Clause[];
  activeClauseId: string | null;
  onClauseClick: (clauseId: string) => void;
  onParagraphClick?: (text: string) => void;
  isLoadingTitle?: boolean;
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
  onParagraphClick,
  isLoadingTitle,
}: CaseFileDocViewerProps) {
  const text = contract.rawText;

  const segments = useMemo(() => {
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const matches: Array<{
      start: number;
      end: number;
      clauseId: string;
      severity: "critical" | "warning" | "info";
    }> = [];

    for (const clause of clauses) {
      let foundStart = -1;
      let foundEnd = -1;

      // Strategy 1: direct substring match
      const directIdx = text.indexOf(clause.originalText);
      if (directIdx !== -1) {
        foundStart = directIdx;
        foundEnd = directIdx + clause.originalText.length;
      }

      // Strategy 2: first/last words regex search across entire document
      if (foundStart === -1) {
        const words = clause.originalText.split(/\s+/).filter(Boolean);
        if (words.length >= 3) {
          const firstWords = words.slice(0, Math.min(6, words.length)).map(escapeRegex).join("[\\s\\S]{0,5}");
          const startRegex = new RegExp(firstWords, "i");
          const startMatch = text.match(startRegex);

          if (startMatch && startMatch.index !== undefined) {
            foundStart = startMatch.index;

            // Find the end using last words
            const lastWords = words.slice(-Math.min(6, words.length)).map(escapeRegex).join("[\\s\\S]{0,5}");
            const endRegex = new RegExp(lastWords, "i");
            const endRegion = text.substring(foundStart, foundStart + clause.originalText.length * 2);
            const endMatch = endRegion.match(endRegex);

            if (endMatch && endMatch.index !== undefined) {
              foundEnd = foundStart + endMatch.index + endMatch[0].length;
            } else {
              foundEnd = Math.min(text.length, foundStart + clause.originalText.length + 30);
            }
          }
        }
      }

      // Strategy 3: normalized whitespace match with proper index mapping
      if (foundStart === -1) {
        const normalizedOriginal = clause.originalText.replace(/\s+/g, " ").trim().toLowerCase();
        const normalizedText = text.replace(/\s+/g, " ").toLowerCase();
        const normIdx = normalizedText.indexOf(normalizedOriginal);

        if (normIdx !== -1) {
          // Map normalized index back to original text position
          let origPos = 0;
          let normPos = 0;
          while (normPos < normIdx && origPos < text.length) {
            if (/\s/.test(text[origPos])) {
              while (origPos < text.length && /\s/.test(text[origPos])) origPos++;
              normPos++; // one space in normalized
            } else {
              origPos++;
              normPos++;
            }
          }
          foundStart = origPos;

          // Map end position
          let endNormTarget = normIdx + normalizedOriginal.length;
          while (normPos < endNormTarget && origPos < text.length) {
            if (/\s/.test(text[origPos])) {
              while (origPos < text.length && /\s/.test(text[origPos])) origPos++;
              normPos++;
            } else {
              origPos++;
              normPos++;
            }
          }
          foundEnd = origPos;
        }
      }

      if (foundStart !== -1 && foundEnd !== -1) {
        matches.push({
          start: foundStart,
          end: foundEnd,
          clauseId: clause.id,
          severity: clause.severity,
        });
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

  const renderText = (content: string, interactive = false) => {
    // Split content into blocks. Handles:
    // 1. Double newline splits (standard paragraph breaks)
    // 2. Single newline splits when the next line is a heading/section
    // 3. Mid-line splits when a section number appears after other text
    //    (common PDF extraction artifact: "1. RENT AND CHARGES 1. 1 Base Rent.")
    const sectionPattern = /(?<=\S\s)\s*(?=(?:ARTICLE\s+\w|\d+\.\s*\d+\s+[A-Z]|\d+\.\s+[A-Z]))/g;

    const blocks: string[] = [];
    for (const chunk of content.split("\n\n")) {
      // First split on single newlines at heading boundaries
      const lines = chunk.split("\n");
      const merged: string[] = [];
      let current = lines[0] || "";
      for (let j = 1; j < lines.length; j++) {
        const line = lines[j].trim();
        const isNewBlock =
          /^ARTICLE\s+/i.test(line) ||
          /^\d+\.\s*\d*\s+[A-Z]/.test(line) ||
          /^\d+\.\s+\d+/.test(line) ||
          /^Section\s+\d/i.test(line) ||
          (line === line.toUpperCase() && line.length > 3 && line.length < 100 && !line.includes("."));
        if (isNewBlock) {
          merged.push(current);
          current = line;
        } else {
          current += "\n" + lines[j];
        }
      }
      merged.push(current);

      // Then split mid-line section numbers (e.g., "HEADING 1. 1 Sub Section")
      for (const block of merged) {
        const parts = block.split(sectionPattern);
        for (const part of parts) {
          if (part.trim()) blocks.push(part);
        }
      }
    }

    return blocks.map((paragraph, i) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      // Check if the block starts with an all-caps title followed by mixed-case text
      // e.g., "COMMERCIAL LEASE AGREEMENT Triple Net (NNN) Lease | ..."
      const capsPrefix = trimmed.match(/^([A-Z][A-Z\s]{3,}[A-Z])\s+(?=[A-Z][a-z])/);
      if (capsPrefix) {
        const heading = capsPrefix[1].trim();
        const rest = trimmed.substring(capsPrefix[0].length).trim();
        const elements: React.ReactNode[] = [
          <h3
            key={`${i}-h`}
            className="mb-2 text-sm font-bold uppercase tracking-wide text-[#FFFFFF]"
          >
            {heading}
          </h3>,
        ];
        // Render the rest (may contain pipes, etc.) — recursively render it
        const restRendered = renderText(rest, interactive);
        if (restRendered) {
          elements.push(<div key={`${i}-r`}>{restRendered}</div>);
        }
        return <div key={i}>{elements}</div>;
      }

      const isHeading =
        /^ARTICLE\s+\d/i.test(trimmed) ||
        (trimmed === trimmed.toUpperCase() && trimmed.length < 100 && !trimmed.includes("."));

      // Detect section headers like "Section 2.0: Indemnification" or "2. 1 Renewal"
      const isSectionHeader = /^\d+\.\s*\d+\s+[A-Z]/.test(trimmed) || /^Section\s+\d/i.test(trimmed);
      const isNumberedSection = /^\d+\.\s+[A-Z]/.test(trimmed);

      const hoverClass = interactive && !isHeading
        ? "rounded-md px-3 py-1.5 -mx-3 ring-1 ring-transparent hover:ring-white/20 transition-shadow duration-150 cursor-pointer"
        : "";
      const clickHandler = interactive && !isHeading
        ? () => onParagraphClick?.(trimmed)
        : undefined;

      // Detect key-value field lines (e.g., "Date: March 15 Premises: 847 Walnut...")
      // Split when there are 2+ "Label:" patterns in one block
      const fieldPattern = /\s+(?=(?:[A-Z][a-z]{2,}(?:\.\s*[A-Z][a-z]{2,})*|Sq\.\s*Ft\.):\s)/g;
      const fieldLabelTest = /^[A-Z].*?:\s/;
      const fieldParts = trimmed.split(fieldPattern);
      if (fieldParts.length >= 2 && fieldParts.every((p) => fieldLabelTest.test(p.trim()))) {
        return (
          <div
            key={i}
            className={`mb-4 text-base leading-[1.8] text-[#cccccc] ${hoverClass}`}
            style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
            onClick={clickHandler}
          >
            {fieldParts.map((field, fi) => {
              const colonIdx = field.indexOf(":");
              const label = field.substring(0, colonIdx + 1).trim();
              const value = field.substring(colonIdx + 1).trim();
              return (
                <div key={fi} className="flex gap-1">
                  <span className="font-semibold text-[#FFFFFF] shrink-0">{label}</span>
                  <span>{value}</span>
                </div>
              );
            })}
          </div>
        );
      }

      // Detect pipe-separated metadata lines (e.g., "Triple Net (NNN) Lease | Lease No. CL-2026-04817")
      if (trimmed.includes(" | ")) {
        const pipeParts = trimmed.split(/\s*\|\s*/);
        if (pipeParts.length >= 2) {
          return (
            <div
              key={i}
              className="mb-4"
              style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
            >
              {pipeParts.map((part, pi) => {
                const t = part.trim();
                return (
                  <div key={pi} className="text-base text-[#999999]">{t}</div>
                );
              })}
            </div>
          );
        }
      }

      if (isHeading) {
        return (
          <h3
            key={i}
            className="mb-4 mt-10 text-sm font-bold uppercase tracking-wide text-[#FFFFFF]"
          >
            {trimmed}
          </h3>
        );
      }

      if (isSectionHeader || isNumberedSection) {
        const match = trimmed.match(/^((?:\d+\.\s*\d*\s*|Section\s+[\d.\s]+[:\s]*))(.+)/i);
        if (match) {
          const [, prefix, rest] = match;
          // Check for "Title. Body" pattern
          const titleMatch = rest.match(/^([^.]+\.)\s*([\s\S]*)/);
          if (titleMatch) {
            const [, title, body] = titleMatch;
            return (
              <p
                key={i}
                className={`mb-4 text-base leading-[1.8] text-[#cccccc] ${hoverClass}`}
                style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
                onClick={clickHandler}
              >
                <em className="text-[#FFFFFF]">{prefix}{title}</em>{" "}
                {body}
              </p>
            );
          }
          return (
            <p
              key={i}
              className={`mb-4 text-base leading-[1.8] text-[#cccccc] ${hoverClass}`}
              style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
              onClick={clickHandler}
            >
              <em className="text-[#FFFFFF]">{trimmed}</em>
            </p>
          );
        }
      }

      return (
        <p
          key={i}
          className={`mb-4 text-base leading-[1.8] text-[#cccccc] ${hoverClass}`}
          style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
          onClick={clickHandler}
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

  const tabColors = {
    critical: { bg: "rgba(239, 68, 68, 0.15)", text: "#EF4444", border: "rgba(239, 68, 68, 0.25)" },
    warning: { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.25)" },
    info: { bg: "rgba(34, 197, 94, 0.12)", text: "#22C55E", border: "rgba(34, 197, 94, 0.25)" },
  };

  const clauseMap = useMemo(() => {
    const map = new Map<string, Clause>();
    for (const c of clauses) map.set(c.id, c);
    return map;
  }, [clauses]);

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
        {isLoadingTitle ? (
          <>
            <div className="h-10 w-3/4 animate-pulse rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
          </>
        ) : (
          <>
            <h1
              className="text-4xl font-semibold leading-tight text-[#FFFFFF]"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              {displayName}
            </h1>
          </>
        )}
      </div>

      {/* Document body */}
      <div className="px-12 py-8 pb-40">
        {segments.map((segment, i) => {
          if (segment.clauseId) {
            const isActive = segment.clauseId === activeClauseId;
            const clause = clauseMap.get(segment.clauseId);
            const tabStyle = tabColors[segment.severity!];
            const clauseIndex = clauses.findIndex((c) => c.id === segment.clauseId);
            const tabLabel = clause
              ? `${clauseIndex + 1}. ${clause.title}`
              : `Item ${clauseIndex + 1}`;
            return (
              <div key={i} className="my-4">
                {/* Tab label */}
                <div className="flex">
                  <span
                    className="inline-block rounded-t-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: tabStyle.bg,
                      color: tabStyle.text,
                      borderTop: `1px solid ${tabStyle.border}`,
                      borderLeft: `1px solid ${tabStyle.border}`,
                      borderRight: `1px solid ${tabStyle.border}`,
                    }}
                  >
                    {tabLabel}
                  </span>
                </div>
                {/* Highlighted body */}
                <div
                  id={`clause-text-${segment.clauseId}`}
                  className={`cursor-pointer rounded-r-lg rounded-bl-lg border-l-3 pl-5 py-2 transition-all duration-200 ${
                    borderColors[segment.severity!]
                  } ${isActive ? "ring-1 ring-[rgba(240,235,227,0.3)]" : ""}`}
                  onClick={() => onClauseClick(segment.clauseId!)}
                >
                  {renderText(segment.text)}
                </div>
              </div>
            );
          }
          return <div key={i}>{renderText(segment.text, true)}</div>;
        })}
      </div>
    </div>
  );
}
