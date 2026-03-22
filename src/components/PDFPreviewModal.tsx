"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Contract, Clause } from "@/lib/types";
import { generatePDFBlobUrl, downloadContractPDF } from "@/lib/export-pdf";

interface PDFPreviewModalProps {
  contract: Contract;
  originalClauses: Clause[];
  onClose: () => void;
}

export default function PDFPreviewModal({
  contract,
  originalClauses,
  onClose,
}: PDFPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const emailRef = useRef<HTMLDivElement>(null);

  // Generate PDF blob
  useEffect(() => {
    const url = generatePDFBlobUrl(contract, originalClauses);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [contract, originalClauses]);

  // Identify revised clauses by diffing original vs current — these are the
  // ones the user explicitly chose to revise. We use the ORIGINAL clause data
  // so we have the original concern, explanation, and what was changed.
  const revisedClauses = originalClauses.filter((orig) => {
    const current = contract.analysis?.clauses.find((c) => c.id === orig.id);
    return current && current.severity === "info" && orig.severity !== "info";
  });

  // Stream AI-generated email
  useEffect(() => {
    const controller = new AbortController();

    async function generateEmail() {
      setEmailLoading(true);
      setEmail("");

      const contractTitle = contract.name
        .replace(/_/g, " ")
        .replace(/\s*v\d+$/i, "")
        .replace(/—.*$/, "")
        .trim();

      if (revisedClauses.length === 0) {
        setEmail("No revisions were made to the contract. The document is ready to export as-is.");
        setEmailLoading(false);
        return;
      }

      const clauseTitles = revisedClauses.map((c) => c.title).join(", ");

      const prompt = `Write a brief, professional email to the other party regarding the contract "${contractTitle}". The sender has reviewed the contract and made revisions to the following clauses: ${clauseTitles}.

Guidelines:
- Keep it short — 3-5 sentences max
- Mention that the attached redlined version reflects the proposed changes
- Briefly note that ${revisedClauses.length} clause${revisedClauses.length > 1 ? "s were" : " was"} revised, but do NOT explain each concern in detail — the redline speaks for itself
- Request that the counterparty review the attached redline and confirm acceptance
- Professional but direct tone
- Use markdown: **bold** for the contract name
- Do NOT include a subject line — start with the salutation
- End with a professional sign-off`;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            model: "claude-haiku-4-5-20251001",
          }),
          signal: controller.signal,
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            for (const line of chunk.split("\n")) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    setEmail((prev) => prev + parsed.text);
                  }
                } catch { /* skip */ }
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setEmail("Unable to generate email. Please try again.");
        }
      } finally {
        setEmailLoading(false);
      }
    }

    generateEmail();
    return () => controller.abort();
  }, []);

  // Auto-scroll email as it streams
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.scrollTo({ top: emailRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [email]);

  const handleCopyEmail = useCallback(async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [email]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative z-10 flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: "min(1400px, 95vw)",
          height: "min(85vh, 900px)",
          background:
            "linear-gradient(135deg, rgba(12, 12, 12, 0.98) 0%, rgba(18, 18, 18, 0.96) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow:
            "0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03) inset",
        }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <h2
            className="text-base font-semibold text-white"
            style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
          >
            {revisedClauses.length > 0 ? "Redline Preview" : "Export Preview"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadContractPDF(contract, originalClauses)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              style={{ background: "#F0EBE3", color: "#050505" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5C5C5C] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#999999]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Two-panel content */}
        <div className="flex flex-1 overflow-hidden">
          {/* PDF Preview */}
          <div className="flex-1 overflow-hidden bg-[#2a2a2a]">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="h-full w-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#F0EBE3]" />
              </div>
            )}
          </div>

          {/* Email panel */}
          <div className="flex-1 flex flex-col border-l border-[rgba(255,255,255,0.06)]">
            {/* Email header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C5C5C]">
                  Draft Email to Counterparty
                </span>
              </div>
              {email && !emailLoading && (
                <button
                  onClick={handleCopyEmail}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-[#5C5C5C] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#999999]"
                >
                  {copied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Email body */}
            <div
              ref={emailRef}
              className="flex-1 overflow-y-auto px-6 py-5"
            >
              {emailLoading && !email ? (
                <div className="flex flex-col gap-3 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#999999]" />
                    <span className="text-xs text-[#5C5C5C]">Generating email...</span>
                  </div>
                  <div className="h-3.5 rounded-full bg-[rgba(255,255,255,0.06)] animate-pulse w-[60%]" />
                  <div className="h-3.5 rounded-full bg-[rgba(255,255,255,0.05)] animate-pulse w-[90%]" style={{ animationDelay: "100ms" }} />
                  <div className="h-3.5 rounded-full bg-[rgba(255,255,255,0.04)] animate-pulse w-[75%]" style={{ animationDelay: "200ms" }} />
                  <div className="h-3.5 rounded-full bg-[rgba(255,255,255,0.04)] animate-pulse w-[45%]" style={{ animationDelay: "300ms" }} />
                </div>
              ) : (
                <div className="text-sm leading-[1.8] text-[#cccccc]">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      em: ({ children }) => <em className="italic text-[#aaaaaa]">{children}</em>,
                      ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
                      li: ({ children }) => <li className="text-[#cccccc]">{children}</li>,
                      a: ({ children, href }) => <a href={href} className="text-[#F0EBE3] underline underline-offset-2">{children}</a>,
                    }}
                  >
                    {email}
                  </ReactMarkdown>
                  {emailLoading && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#F0EBE3]" />}
                </div>
              )}
            </div>

            {/* Revision summary footer */}
            {revisedClauses.length > 0 && (
              <div className="shrink-0 px-5 py-3 border-t border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-[#5C5C5C]">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#22C55E]" />
                    {revisedClauses.length} {revisedClauses.length === 1 ? "clause" : "clauses"} revised
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
