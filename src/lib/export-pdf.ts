import jsPDF from "jspdf";
import { Contract } from "@/lib/types";

export function generateContractPDF(contract: Contract) {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 72; // 1 inch
  const marginRight = 72;
  const marginTop = 72;
  const marginBottom = 72;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = marginTop;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  // Derive clean title
  const title = contract.name
    .replace(/_/g, " ")
    .replace(/\s*v\d+$/i, "")
    .replace(/—.*$/, "")
    .trim();

  // ── Title ──
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), contentWidth);
  checkPageBreak(titleLines.length * 28 + 20);
  doc.text(titleLines, pageWidth / 2, y, { align: "center" });
  y += titleLines.length * 28;

  // Decorative line under title
  y += 8;
  doc.setDrawColor(0);
  doc.setLineWidth(0.75);
  doc.line(marginLeft + 100, y, pageWidth - marginRight - 100, y);
  y += 24;

  // Date
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  const dateStr = new Date(contract.uploadedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Effective Date: ${dateStr}`, pageWidth / 2, y, { align: "center" });
  y += 32;

  // ── Body ──
  const text = contract.rawText;
  const paragraphs = text.split(/\n\n+/);

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    const isArticleHeading =
      /^ARTICLE\s+\d/i.test(trimmed) ||
      (trimmed === trimmed.toUpperCase() &&
        trimmed.length < 100 &&
        !trimmed.includes("."));

    const isSectionHeader =
      /^\d+\.\d+\s+[A-Z]/.test(trimmed) ||
      /^Section\s+\d/i.test(trimmed) ||
      /^\d+\.\s+[A-Z]/.test(trimmed);

    if (isArticleHeading) {
      // Article heading — bold, centered, uppercase
      checkPageBreak(40);
      y += 16;
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.text(trimmed.toUpperCase(), pageWidth / 2, y, { align: "center" });
      y += 22;
    } else if (isSectionHeader) {
      // Section header — bold, left-aligned
      checkPageBreak(36);
      y += 10;
      doc.setFont("times", "bold");
      doc.setFontSize(11);

      // Split into header title and body if there's a period separator
      const headerMatch = trimmed.match(
        /^((?:\d+\.\d*\s*|Section\s+[\d.]+[:\s]*)(?:[^.]+\.))\s*([\s\S]*)/i
      );
      if (headerMatch) {
        const [, headerTitle, bodyText] = headerMatch;
        const headerLines = doc.splitTextToSize(headerTitle, contentWidth);
        checkPageBreak(headerLines.length * 15 + 10);
        doc.text(headerLines, marginLeft, y);
        y += headerLines.length * 15;

        if (bodyText.trim()) {
          doc.setFont("times", "normal");
          doc.setFontSize(11);
          const bodyLines = doc.splitTextToSize(bodyText.trim(), contentWidth);
          checkPageBreak(bodyLines.length * 15);
          y += 4;
          doc.text(bodyLines, marginLeft, y);
          y += bodyLines.length * 15;
        }
      } else {
        const lines = doc.splitTextToSize(trimmed, contentWidth);
        checkPageBreak(lines.length * 15 + 10);
        doc.text(lines, marginLeft, y);
        y += lines.length * 15;
      }
      y += 6;
    } else {
      // Regular paragraph — normal, justified-style
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(trimmed, contentWidth);
      checkPageBreak(lines.length * 15 + 8);
      doc.text(lines, marginLeft, y);
      y += lines.length * 15 + 8;
    }
  }

  // ── Signature block ──
  y += 20;
  checkPageBreak(120);
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);

  doc.setFont("times", "normal");
  doc.setFontSize(10);

  // Left signature
  const sigY = y + 40;
  doc.line(marginLeft, sigY, marginLeft + 200, sigY);
  doc.text("Signature", marginLeft, sigY + 14);
  doc.line(marginLeft, sigY + 40, marginLeft + 200, sigY + 40);
  doc.text("Printed Name & Title", marginLeft, sigY + 54);
  doc.line(marginLeft, sigY + 80, marginLeft + 140, sigY + 80);
  doc.text("Date", marginLeft, sigY + 94);

  // Right signature
  const rightCol = pageWidth - marginRight - 200;
  doc.line(rightCol, sigY, rightCol + 200, sigY);
  doc.text("Signature", rightCol, sigY + 14);
  doc.line(rightCol, sigY + 40, rightCol + 200, sigY + 40);
  doc.text("Printed Name & Title", rightCol, sigY + 54);
  doc.line(rightCol, sigY + 80, rightCol + 140, sigY + 80);
  doc.text("Date", rightCol, sigY + 94);

  // ── Page numbers ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 36, {
      align: "center",
    });
    doc.setTextColor(0);
  }

  return { doc, filename: title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") };
}

export function generatePDFBlobUrl(contract: Contract): string {
  const { doc } = generateContractPDF(contract);
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}

export function downloadContractPDF(contract: Contract) {
  const { doc, filename } = generateContractPDF(contract);
  doc.save(`${filename}.pdf`);
}
