import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

async function extractPdfText(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid build-time issues
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Use Y-position to detect line and paragraph breaks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = content.items.filter((item: any) => item.str && item.str.trim());
    if (items.length === 0) continue;

    const lines: string[] = [];
    let currentLine = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastY: number | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastHeight: number | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of items as any[]) {
      const y = item.transform?.[5] ?? 0;
      const height = item.height || Math.abs(item.transform?.[3] ?? 12);

      if (lastY !== null) {
        const gap = Math.abs(lastY - y);

        if (gap > height * 1.8) {
          // Large gap = paragraph break
          if (currentLine.trim()) lines.push(currentLine.trim());
          lines.push(""); // empty line marks paragraph break
          currentLine = item.str;
        } else if (gap > height * 0.3) {
          // Normal line break
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = item.str;
        } else {
          // Same line — append with space
          currentLine += (item.str.startsWith(" ") ? "" : " ") + item.str;
        }
      } else {
        currentLine = item.str;
      }

      lastY = y;
      lastHeight = height;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    // Convert lines to paragraphs: join consecutive non-empty lines,
    // split on empty lines
    const paragraphs: string[] = [];
    let currentParagraph = "";
    for (const line of lines) {
      if (line === "") {
        if (currentParagraph.trim()) {
          paragraphs.push(currentParagraph.trim());
        }
        currentParagraph = "";
      } else {
        currentParagraph += (currentParagraph ? " " : "") + line;
      }
    }
    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }

    pages.push(paragraphs.join("\n\n"));
  }

  return pages.join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    let text = "";

    if (fileName.endsWith(".pdf")) {
      text = await extractPdfText(buffer);
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or DOCX file." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      text: text.trim(),
      fileName: file.name,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}
