"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import React from "react";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "@/lib/types";

interface FloatingAIBarProps {
  placeholder?: string;
  contractText?: string;
  chatHistory: ChatMessage[];
  onChatUpdate: (messages: ChatMessage[]) => void;
}

type BorderState = "idle" | "settled" | "leaving";

const MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", desc: "Fast" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", desc: "Balanced" },
  { id: "claude-opus-4-6", label: "Opus 4.6", desc: "Best" },
] as const;

const CONIC_GRADIENT =
  "conic-gradient(from 0deg, #F5F0E8, #FFFFFF, #F0EBE3, #FFFFFF, #F5F0E8, #FFFFFF, #F0EBE3, #FFFFFF, #F5F0E8)";

const BAR_GLASS =
  "linear-gradient(135deg, rgba(12, 12, 12, 0.96) 0%, rgba(18, 18, 18, 0.94) 100%)";

export default function FloatingAIBar({
  placeholder = "Ask anything about contracts...",
  contractText,
  chatHistory,
  onChatUpdate,
}: FloatingAIBarProps) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [borderState, setBorderState] = useState<BorderState>("idle");
  const [flashKey, setFlashKey] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  // Expanded state — the bar grows upward
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [followups, setFollowups] = useState<string[]>([]);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  // Whether the conic border should spin (during streaming)
  const [borderSpin, setBorderSpin] = useState(false);
  const [spinFlashKey, setSpinFlashKey] = useState(0);

  // Typewriter state
  const [visibleLength, setVisibleLength] = useState(0);
  const lastScrollTime = useRef(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const modelMenuOpenRef = useRef(false);

  const stateRef = useRef<BorderState>("idle");
  const focusedRef = useRef(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => { stateRef.current = borderState; }, [borderState]);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  useEffect(() => () => clearTimers(), []);

  // Reset typewriter when answer is cleared (new question)
  useEffect(() => {
    if (answer === "") setVisibleLength(0);
  }, [answer]);

  // Typewriter — smoothly reveal characters via RAF
  useEffect(() => {
    if (visibleLength >= answer.length) return;

    const rafId = requestAnimationFrame(() => {
      setVisibleLength((prev) => {
        // Faster catchup after streaming ends
        const step = isStreaming ? 3 : 10;
        return Math.min(prev + step, answer.length);
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [visibleLength, answer.length, isStreaming]);

  const displayedAnswer = answer.substring(0, visibleLength);
  const isTypewriting = visibleLength < answer.length;

  // Auto-scroll as content is revealed (throttled)
  useEffect(() => {
    if (!contentRef.current || visibleLength === 0) return;
    const now = Date.now();
    if (now - lastScrollTime.current > 150) {
      lastScrollTime.current = now;
      contentRef.current.scrollTo({ top: contentRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleLength]);

  // Auto-scroll when follow-ups appear
  useEffect(() => {
    if (!contentRef.current) return;
    // Small delay to let the motion animation expand before scrolling
    const timer = setTimeout(() => {
      contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: "smooth" });
    }, 150);
    return () => clearTimeout(timer);
  }, [followups, followupsLoading]);

  // Close on Escape, open on /
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded && !isStreaming) {
        setIsExpanded(false);
      }
      if (e.key === "/" && !isExpanded && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, isStreaming]);

  // Click outside to collapse
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        isExpanded && !isStreaming &&
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        !modelMenuRef.current?.contains(e.target as Node)
      ) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isExpanded, isStreaming]);

  // Close model menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        modelMenuRef.current && !modelMenuRef.current.contains(e.target as HTMLElement) &&
        modelBtnRef.current && !modelBtnRef.current.contains(e.target as HTMLElement)
      ) setModelMenuOpen(false);
    };
    if (modelMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modelMenuOpen]);

  const prevMenuOpen = useRef(false);
  useEffect(() => {
    const wasOpen = prevMenuOpen.current;
    prevMenuOpen.current = modelMenuOpen;
    if (wasOpen && !modelMenuOpen && !focusedRef.current && stateRef.current === "settled") {
      clearTimers();
      setBorderState("leaving");
      timersRef.current.push(setTimeout(() => setBorderState("idle"), 500));
    }
  }, [modelMenuOpen]);

  modelMenuOpenRef.current = modelMenuOpen;

  const toggleModelMenu = useCallback(() => {
    if (modelMenuOpen) { setModelMenuOpen(false); return; }
    if (modelBtnRef.current) {
      const rect = modelBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.top - 4, right: window.innerWidth - rect.right });
    }
    setModelMenuOpen(true);
  }, [modelMenuOpen]);

  const handleFocus = useCallback(() => {
    focusedRef.current = true;
    clearTimers();
    setBorderState("settled");
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    focusedRef.current = false;
    clearTimers();
    if (isStreaming) return;
    const related = e.relatedTarget as HTMLElement | null;
    if (related && (modelBtnRef.current?.contains(related) || modelMenuRef.current?.contains(related))) return;
    timersRef.current.push(
      setTimeout(() => {
        if (modelMenuOpenRef.current) return;
        setBorderState("leaving");
        timersRef.current.push(setTimeout(() => setBorderState("idle"), 500));
      }, 0)
    );
  }, [isStreaming]);

  // Fetch follow-ups
  const fetchFollowups = useCallback(async (q: string, a: string) => {
    setFollowupsLoading(true);
    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, answer: a, contractText }),
      });
      const data = await res.json();
      setFollowups(data.followups || []);
    } catch {
      setFollowups(["Can you explain this in simpler terms?", "What are the key risks here?", "What would you recommend instead?"]);
    } finally {
      setFollowupsLoading(false);
    }
  }, [contractText]);

  const handleSend = useCallback(async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const newMessages = [...chatHistory, userMessage];
    onChatUpdate(newMessages);
    setInput("");
    setIsStreaming(true);
    setFollowups([]);

    // Expand the bar upward
    setQuestion(text);
    setAnswer("");
    setIsExpanded(true);
    setBorderSpin(true);
    setSpinFlashKey((k) => k + 1);
    setBorderState("settled");

    if (inputRef.current) inputRef.current.style.height = "auto";

    let fullAnswer = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, contractText, model: selectedModel }),
      });
      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const assistantMessage: ChatMessage = { role: "assistant", content: "" };
      onChatUpdate([...newMessages, assistantMessage]);

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
                  assistantMessage.content += parsed.text;
                  fullAnswer = assistantMessage.content;
                  setAnswer(fullAnswer);
                  onChatUpdate([...newMessages, { ...assistantMessage }]);
                }
              } catch { /* skip */ }
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      fullAnswer = "Sorry, I encountered an error. Please try again.";
      setAnswer(fullAnswer);
      onChatUpdate([...newMessages, { role: "assistant", content: fullAnswer }]);
    } finally {
      setIsStreaming(false);
      setBorderSpin(false);
      if (fullAnswer) fetchFollowups(text, fullAnswer);
    }
  }, [input, isStreaming, chatHistory, onChatUpdate, contractText, selectedModel, fetchFollowups]);

  const handleFollowupClick = useCallback((followup: string) => {
    handleSend(followup);
  }, [handleSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const hasInput = input.trim().length > 0;
  const isFocused = borderState === "settled";

  // Border opacity/animation
  const borderOpacity = (() => {
    if (borderSpin) return 0.85;
    if (borderState === "settled") return 0.55;
    if (borderState === "leaving") return 0;
    return 0;
  })();

  const borderTransition = borderState === "leaving"
    ? "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
    : "opacity 0.2s ease-in";

  const glowShadow = (() => {
    if (borderSpin) return "0 0 30px rgba(232, 220, 200, 0.2), 0 0 80px rgba(212, 200, 176, 0.1)";
    if (isExpanded) return "0 0 16px rgba(232, 220, 200, 0.12)";
    return "none";
  })();

  return (
    <div
      ref={panelRef}
      className="fixed bottom-6 left-0 right-0 z-50 mx-auto"
      style={{
        width: isFocused || isExpanded || isStreaming ? "min(720px, 90vw)" : "min(400px, 90vw)",
        transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Single unified container — border wrapper */}
      <div
        className="relative rounded-2xl p-[1.5px] overflow-hidden"
        style={{
          boxShadow: `${glowShadow}${glowShadow !== "none" ? ", " : ""}0 8px 32px rgba(0, 0, 0, 0.4)`,
          transition: "box-shadow 0.5s ease",
        }}
      >
        {/* Conic gradient border */}
        <div
          key={spinFlashKey}
          className={`absolute inset-[-100%] ${borderSpin ? "animate-border-rotate" : borderState === "leaving" ? "animate-border-fizzle" : ""}`}
          style={{ background: CONIC_GRADIENT, opacity: borderOpacity, transition: borderTransition }}
        />

        {/* Static border — visible when idle */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: "1.5px solid rgba(255, 255, 255, 0.14)",
            opacity: borderState === "idle" && !borderSpin ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Glass body */}
        <div
          className="relative rounded-[14px]"
          style={{ background: BAR_GLASS, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
        >
          {/* Inner glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-12 pointer-events-none rounded-t-[14px]"
            style={{ background: "radial-gradient(ellipse at 50% -20%, rgba(232, 220, 200, 0.05) 0%, transparent 70%)" }}
          />

          {/* ===== EXPANDABLE CONTENT AREA — grows upward ===== */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                key="expanded-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { type: "spring", damping: 28, stiffness: 200, mass: 0.8 },
                  opacity: { duration: 0.2 },
                }}
                className="overflow-hidden"
              >
                <div
                  ref={contentRef}
                  className="px-5 pt-4 pb-2 overflow-y-auto"
                  style={{ maxHeight: "calc(100vh - 160px)" }}
                >
                  {/* User question */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(240,235,227,0.15)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F0EBE3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-white leading-relaxed">{question}</p>
                  </div>

                  <div className="h-px bg-[rgba(255,255,255,0.06)] mb-3" />

                  {/* AI answer */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(240,235,227,0.1)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F0EBE3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 min-h-[120px]">
                      {answer ? (
                        <div className="ai-markdown text-sm leading-[1.75] text-[#cccccc]">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                              em: ({ children }) => <em className="italic text-[#aaaaaa]">{children}</em>,
                              ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
                              li: ({ children }) => <li className="text-[#cccccc]">{children}</li>,
                              h1: ({ children }) => <h1 className="mb-2 mt-4 text-base font-bold text-white first:mt-0">{children}</h1>,
                              h2: ({ children }) => <h2 className="mb-2 mt-3 text-sm font-bold text-white first:mt-0">{children}</h2>,
                              h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-semibold text-white first:mt-0">{children}</h3>,
                              code: ({ children, className }) => {
                                const isBlock = className?.includes("language-");
                                if (isBlock) {
                                  return <code className="block my-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] px-4 py-3 text-xs font-mono text-[#cccccc] overflow-x-auto whitespace-pre">{children}</code>;
                                }
                                return <code className="rounded bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-xs font-mono text-[#d4d4d4]">{children}</code>;
                              },
                              pre: ({ children }) => <>{children}</>,
                              blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-[rgba(240,235,227,0.3)] pl-4 text-[#999999] italic">{children}</blockquote>,
                              hr: () => <hr className="my-4 border-[rgba(255,255,255,0.06)]" />,
                              a: ({ children, href }) => <a href={href} className="text-[#F0EBE3] underline underline-offset-2 hover:text-[#F5EFE0]" target="_blank" rel="noopener noreferrer">{children}</a>,
                            }}
                          >
                            {displayedAnswer}
                          </ReactMarkdown>
                          {(isStreaming || isTypewriting) && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#F0EBE3]" />}
                        </div>
                      ) : (
                        /* Skeleton — shown while waiting for first token */
                        <div className="flex flex-col gap-2.5 py-0.5 min-h-[120px]">
                          <div className="h-3.5 rounded-full bg-[rgba(255,255,255,0.06)] animate-pulse w-[92%]" />
                          <div className="h-3.5 rounded-full bg-[rgba(255,255,255,0.05)] animate-pulse w-[78%]" style={{ animationDelay: "100ms" }} />
                          <div className="h-3.5 rounded-full bg-[rgba(255,255,255,0.04)] animate-pulse w-[65%]" style={{ animationDelay: "200ms" }} />
                          <div className="h-3.5 rounded-full bg-[rgba(255,255,255,0.03)] animate-pulse w-[45%]" style={{ animationDelay: "300ms" }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Follow-ups */}
                  <AnimatePresence>
                    {!isStreaming && answer && (followups.length > 0 || followupsLoading) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="overflow-hidden"
                      >
                        <div className="h-px bg-[rgba(255,255,255,0.06)] mt-4 mb-3" />

                        {followupsLoading ? (
                          <div className="flex items-center gap-2 py-1">
                            <div className="flex gap-1">
                              <span className="h-1 w-1 rounded-full bg-[#5C5C5C] animate-pulse" />
                              <span className="h-1 w-1 rounded-full bg-[#5C5C5C] animate-pulse" style={{ animationDelay: "150ms" }} />
                              <span className="h-1 w-1 rounded-full bg-[#5C5C5C] animate-pulse" style={{ animationDelay: "300ms" }} />
                            </div>
                            <span className="text-[11px] text-[#5C5C5C]">Generating follow-ups...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C5C5C] mb-0.5">Follow up</span>
                            {followups.map((fu, i) => (
                              <motion.button
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: i * 0.07 }}
                                onClick={() => handleFollowupClick(fu)}
                                className="group flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left transition-all duration-150 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(240,235,227,0.08)] hover:border-[rgba(240,235,227,0.2)]"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0EBE3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                                <span className="text-[13px] text-[#999999] group-hover:text-[#cccccc] transition-colors">{fu}</span>
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Divider between content and input */}
                <div className="h-px bg-[rgba(255,255,255,0.06)] mx-4" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== INPUT AREA — always at the bottom ===== */}
          <div className="px-4 pt-3 pb-2.5 flex flex-col relative">
            {/* Textarea (or question preview while streaming) */}
            {isStreaming ? (
              <div className="py-0.5 flex items-center gap-2">
                <div className="flex gap-1 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F0EBE3] animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F0EBE3] animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F0EBE3] animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-sm text-[#5C5C5C]">Generating response...</span>
              </div>
            ) : (
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                }}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                rows={1}
                className={`w-full bg-transparent text-sm focus:outline-none focus:ring-0 border-none outline-none resize-none overflow-y-auto transition-colors duration-200 ${isFocused ? "ai-placeholder-bright" : "ai-placeholder-dim"}`}
                style={{ boxShadow: "none", WebkitAppearance: "none", color: isFocused ? "#ffffff" : "rgba(234, 234, 240, 0.6)" }}
              />
            )}

            {/* Model selector + Send/Close */}
            <div className="flex justify-between items-center gap-1.5 mt-1">
              {/* Left: close button when expanded */}
              <div>
                {isExpanded && !isStreaming && (
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-[#5C5C5C] rounded-lg transition-colors hover:text-[#999999] hover:bg-[rgba(255,255,255,0.04)]"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 15 12 9 18 15" />
                    </svg>
                    Collapse
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Model selector */}
                <div className="relative">
                  <button
                    ref={modelBtnRef}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={toggleModelMenu}
                    disabled={isStreaming}
                    className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      background: modelMenuOpen ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.04)",
                      color: isFocused ? "rgba(255, 255, 255, 0.55)" : "rgba(255, 255, 255, 0.25)",
                      border: modelMenuOpen ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    {MODELS.find((m) => m.id === selectedModel)?.label}
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ opacity: 0.5 }}><path d="M1.5 5L4 2.5L6.5 5" /></svg>
                  </button>
                </div>

                {/* Model menu */}
                {modelMenuOpen && menuPos && createPortal(
                  <div
                    ref={modelMenuRef}
                    className="fixed z-[60] w-44 rounded-xl overflow-hidden"
                    style={{
                      top: menuPos.top, right: menuPos.right, transform: "translateY(-100%)",
                      background: "linear-gradient(145deg, rgba(14, 16, 24, 0.95) 0%, rgba(20, 22, 32, 0.9) 100%)",
                      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.02) inset",
                    }}
                  >
                    {MODELS.map((m) => (
                      <button
                        key={m.id} type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setSelectedModel(m.id); setModelMenuOpen(false); inputRef.current?.focus(); }}
                        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors duration-150 hover:bg-white/[0.06]"
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-medium" style={{ color: selectedModel === m.id ? "#ffffff" : "rgba(255,255,255,0.7)" }}>{m.label}</span>
                          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{m.desc}</span>
                        </div>
                        {selectedModel === m.id && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(232, 220, 200, 0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3" /></svg>
                        )}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}

                <button
                  onClick={() => handleSend()}
                  disabled={isStreaming || !hasInput}
                  className="flex-shrink-0 px-3.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                  style={{
                    background: hasInput && !isStreaming ? "#F0EBE3" : isFocused ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.06)",
                    color: hasInput && !isStreaming ? "#050505" : isFocused ? "rgba(255, 255, 255, 0.68)" : "rgba(255, 255, 255, 0.25)",
                    border: hasInput && !isStreaming ? "1px solid #F0EBE3" : isFocused ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  {isStreaming ? "Thinking..." : "Ask"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
