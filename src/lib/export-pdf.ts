import jsPDF from "jspdf";
import { Contract, Clause } from "@/lib/types";

interface Redline {
  deleted: string;
  inserted: string;
}

function buildRedlines(originalClauses: Clause[], currentClauses: Clause[]): Redline[] {
  const redlines: Redline[] = [];
  for (const orig of originalClauses) {
    if (orig.severity === "info") continue;
    const current = currentClauses.find((c) => c.id === orig.id);
    if (current && current.severity === "info") {
      redlines.push({ deleted: orig.originalText, inserted: orig.suggestedReplacement });
    }
  }
  return redlines;
}

interface TextRun {
  text: string;
  style: "normal" | "deleted" | "inserted";
}

function segmentText(originalRawText: string, redlines: Redline[]): TextRun[] {
  interface Match { start: number; end: number; redline: Redline }
  const matches: Match[] = [];

  for (const rl of redlines) {
    let idx = originalRawText.indexOf(rl.deleted);
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + rl.deleted.length, redline: rl });
      continue;
    }
    // Normalized whitespace match
    const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const normalizedOrig = normalize(rl.deleted);
    const normalizedFull = normalize(originalRawText);
    const normIdx = normalizedFull.indexOf(normalizedOrig);
    if (normIdx !== -1) {
      let origPos = 0, normPos = 0;
      while (normPos < normIdx && origPos < originalRawText.length) {
        if (/\s/.test(originalRawText[origPos])) {
          while (origPos < originalRawText.length && /\s/.test(originalRawText[origPos])) origPos++;
          normPos++;
        } else { origPos++; normPos++; }
      }
      const foundStart = origPos;
      let matchLen = 0;
      while (matchLen < normalizedOrig.length && origPos < originalRawText.length) {
        if (/\s/.test(originalRawText[origPos])) {
          while (origPos < originalRawText.length && /\s/.test(originalRawText[origPos])) origPos++;
          matchLen++;
        } else { origPos++; matchLen++; }
      }
      matches.push({ start: foundStart, end: origPos, redline: rl });
    }
  }

  matches.sort((a, b) => a.start - b.start);
  const runs: TextRun[] = [];
  let pos = 0;
  for (const m of matches) {
    if (m.start > pos) runs.push({ text: originalRawText.substring(pos, m.start), style: "normal" });
    if (m.start >= pos) {
      runs.push({ text: originalRawText.substring(m.start, m.end), style: "deleted" });
      runs.push({ text: m.redline.inserted, style: "inserted" });
      pos = m.end;
    }
  }
  if (pos < originalRawText.length) runs.push({ text: originalRawText.substring(pos), style: "normal" });
  return runs;
}

// ── PDF Layout Helpers ──

interface LayoutCtx {
  doc: jsPDF;
  marginLeft: number;
  contentWidth: number;
  pageWidth: number;
  pageHeight: number;
  marginBottom: number;
  marginTop: number;
  y: number;
}

function checkPageBreak(ctx: LayoutCtx, needed: number) {
  if (ctx.y + needed > ctx.pageHeight - ctx.marginBottom) {
    ctx.doc.addPage();
    ctx.y = ctx.marginTop;
  }
}

function isArticleHeading(text: string): boolean {
  return /^ARTICLE\s+\d/i.test(text) ||
    (text === text.toUpperCase() && text.length < 100 && !text.includes("."));
}

function isSectionHeader(text: string): boolean {
  return /^\d+\.\d+\s+[A-Z]/.test(text) ||
    /^Section\s+\d/i.test(text) ||
    /^\d+\.\s+[A-Z]/.test(text);
}

// ── Main Export ──

export function generateContractPDF(contract: Contract, originalClauses?: Clause[]) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 72;
  const marginRight = 72;
  const marginTop = 72;
  const marginBottom = 72;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const ctx: LayoutCtx = { doc, marginLeft, contentWidth, pageWidth, pageHeight, marginBottom, marginTop, y: marginTop };

  const title = contract.name.replace(/_/g, " ").replace(/\s*v\d+$/i, "").replace(/—.*$/, "").trim();

  const currentClauses = contract.analysis?.clauses ?? [];
  const redlines = originalClauses ? buildRedlines(originalClauses, currentClauses) : [];
  const isRedline = redlines.length > 0;

  // Reconstruct original raw text by reversing replacements
  let originalRawText = contract.rawText;
  if (isRedline) {
    for (const rl of redlines) {
      if (originalRawText.includes(rl.inserted)) {
        originalRawText = originalRawText.replace(rl.inserted, rl.deleted);
      }
    }
  }

  // ── Title ──
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), contentWidth);
  checkPageBreak(ctx, titleLines.length * 28 + 20);
  doc.text(titleLines, pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += titleLines.length * 28;

  // Decorative line
  ctx.y += 8;
  doc.setDrawColor(0);
  doc.setLineWidth(0.75);
  doc.line(marginLeft + 100, ctx.y, pageWidth - marginRight - 100, ctx.y);
  ctx.y += 24;

  // Date
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0);
  const dateStr = new Date(contract.uploadedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Effective Date: ${dateStr}`, pageWidth / 2, ctx.y, { align: "center" });
  ctx.y += 32;

  if (!isRedline) {
    renderPlainBody(ctx, contract.rawText);
  } else {
    const runs = segmentText(originalRawText, redlines);
    renderRedlineBody(ctx, runs);

  }

  // ── Page numbers ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 36, { align: "center" });
    doc.setTextColor(0);
  }

  return { doc, filename: title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") };
}

// ── Plain body rendering ──

function renderPlainBody(ctx: LayoutCtx, text: string) {
  const { doc, marginLeft, contentWidth, pageWidth } = ctx;
  const paragraphs = text.split(/\n\n+/);

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (isArticleHeading(trimmed)) {
      checkPageBreak(ctx, 40);
      ctx.y += 16;
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(trimmed.toUpperCase(), pageWidth / 2, ctx.y, { align: "center" });
      ctx.y += 22;
    } else if (isSectionHeader(trimmed)) {
      checkPageBreak(ctx, 36);
      ctx.y += 10;
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0);
      const m = trimmed.match(/^((?:\d+\.\d*\s*|Section\s+[\d.]+[:\s]*)(?:[^.]+\.))\s*([\s\S]*)/i);
      if (m) {
        const lines = doc.splitTextToSize(m[1], contentWidth);
        checkPageBreak(ctx, lines.length * 15 + 10);
        doc.text(lines, marginLeft, ctx.y);
        ctx.y += lines.length * 15;
        if (m[2].trim()) {
          doc.setFont("times", "normal");
          doc.setFontSize(11);
          const blines = doc.splitTextToSize(m[2].trim(), contentWidth);
          checkPageBreak(ctx, blines.length * 15);
          ctx.y += 4;
          doc.text(blines, marginLeft, ctx.y);
          ctx.y += blines.length * 15;
        }
      } else {
        const lines = doc.splitTextToSize(trimmed, contentWidth);
        checkPageBreak(ctx, lines.length * 15 + 10);
        doc.text(lines, marginLeft, ctx.y);
        ctx.y += lines.length * 15;
      }
      ctx.y += 6;
    } else {
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(trimmed, contentWidth);
      checkPageBreak(ctx, lines.length * 15 + 8);
      doc.text(lines, marginLeft, ctx.y);
      ctx.y += lines.length * 15 + 8;
    }
  }
}

// ── Redline body rendering ──

interface StyledParagraph {
  runs: TextRun[];
  heading: boolean;
  section: boolean;
}

function renderRedlineBody(ctx: LayoutCtx, runs: TextRun[]) {
  const { doc, marginLeft, contentWidth, pageWidth } = ctx;
  const lineHeight = 15;
  const fontSize = 11;

  // Split runs into paragraphs at double-newlines
  const paragraphs: StyledParagraph[] = [];
  let currentRuns: TextRun[] = [];

  const flushParagraph = () => {
    if (currentRuns.length === 0) return;
    const fullText = currentRuns.map((r) => r.text).join("").trim();
    paragraphs.push({
      runs: [...currentRuns],
      heading: isArticleHeading(fullText),
      section: isSectionHeader(fullText),
    });
    currentRuns = [];
  };

  for (const run of runs) {
    const parts = run.text.split(/\n\n+/);
    for (let pi = 0; pi < parts.length; pi++) {
      if (pi > 0) flushParagraph();
      if (parts[pi]) currentRuns.push({ text: parts[pi], style: run.style });
    }
  }
  flushParagraph();

  for (const para of paragraphs) {
    const fullText = para.runs.map((r) => r.text).join("").trim();
    if (!fullText) continue;

    if (para.heading) {
      checkPageBreak(ctx, 40);
      ctx.y += 16;
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(fullText.toUpperCase(), pageWidth / 2, ctx.y, { align: "center" });
      ctx.y += 22;
      continue;
    }

    if (para.section) {
      checkPageBreak(ctx, 36);
      ctx.y += 10;
    }

    const hasRedlines = para.runs.some((r) => r.style !== "normal");

    if (!hasRedlines) {
      const font = para.section ? "bold" : "normal";
      doc.setFont("times", font);
      doc.setFontSize(fontSize);
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(fullText, contentWidth);
      checkPageBreak(ctx, lines.length * lineHeight + 8);
      doc.text(lines, marginLeft, ctx.y);
      ctx.y += lines.length * lineHeight + 8;
    } else {
      renderRedlineParagraph(ctx, para.runs, lineHeight, fontSize);
      ctx.y += 8;
    }
  }
}

function renderRedlineParagraph(
  ctx: LayoutCtx,
  runs: TextRun[],
  lineHeight: number,
  fontSize: number,
) {
  const { doc, marginLeft, contentWidth } = ctx;
  let x = marginLeft;

  doc.setFontSize(fontSize);

  for (const run of runs) {
    if (run.style === "deleted") {
      doc.setFont("times", "normal");
      doc.setTextColor(200, 0, 0);
    } else if (run.style === "inserted") {
      doc.setFont("times", "bold");
      doc.setTextColor(200, 0, 0);
    } else {
      doc.setFont("times", "normal");
      doc.setTextColor(0);
    }

    const words = run.text.replace(/\s+/g, " ").split(" ").filter(Boolean);

    for (const word of words) {
      const wordWidth = doc.getTextWidth(word);
      const spaceWidth = doc.getTextWidth(" ");

      if (x + wordWidth > marginLeft + contentWidth && x > marginLeft) {
        x = marginLeft;
        ctx.y += lineHeight;
        checkPageBreak(ctx, lineHeight);
      }

      checkPageBreak(ctx, lineHeight);
      doc.text(word, x, ctx.y);

      if (run.style === "deleted") {
        doc.setDrawColor(200, 0, 0);
        doc.setLineWidth(0.6);
        doc.line(x, ctx.y - 3.5, x + wordWidth, ctx.y - 3.5);
      }

      if (run.style === "inserted") {
        doc.setDrawColor(200, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(x, ctx.y + 2, x + wordWidth, ctx.y + 2);
      }

      x += wordWidth + spaceWidth;
    }
  }

  ctx.y += lineHeight;
}

export function generatePDFBlobUrl(contract: Contract, originalClauses?: Clause[]): string {
  const { doc } = generateContractPDF(contract, originalClauses);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

export function downloadContractPDF(contract: Contract, originalClauses?: Clause[]) {
  const { doc, filename } = generateContractPDF(contract, originalClauses);
  doc.save(`${filename}.pdf`);
}
