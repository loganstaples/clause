"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "@/lib/types";

interface FloatingAIBarProps {
  placeholder?: string;
  contractText?: string;
  chatHistory: ChatMessage[];
  onChatUpdate: (messages: ChatMessage[]) => void;
  contextParagraph?: string | null;
  onClearContext?: () => void;
  onFixAll?: () => void;
  onExport?: () => void;
}

type BorderState = "idle" | "settled" | "leaving";
type VoiceMode = "idle" | "connecting" | "active" | "error";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const CONIC_GRADIENT =
  "conic-gradient(from 0deg, #F5F0E8, #FFFFFF, #F0EBE3, #FFFFFF, #F5F0E8, #FFFFFF, #F0EBE3, #FFFFFF, #F5F0E8)";

const BAR_GLASS =
  "linear-gradient(135deg, rgba(12, 12, 12, 0.96) 0%, rgba(18, 18, 18, 0.94) 100%)";

export default function FloatingAIBar({
  placeholder = "Ask anything about contracts...",
  contractText,
  chatHistory,
  onChatUpdate,
  contextParagraph,
  onClearContext,
  onFixAll,
  onExport,
}: FloatingAIBarProps) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [borderState, setBorderState] = useState<BorderState>("idle");
  const [flashKey, setFlashKey] = useState(0);
  const selectedModel = DEFAULT_MODEL;

  // Voice mode
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("idle");
  const [voiceError, setVoiceError] = useState("");

  // Expanded state — the bar grows upward
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [followups, setFollowups] = useState<string[]>([]);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  // Whether the conic border should spin (during streaming)
  const [borderSpin, setBorderSpin] = useState(false);
  const [spinFlashKey, setSpinFlashKey] = useState(0);

  // Paragraph context state
  const [activeParagraph, setActiveParagraph] = useState<string | null>(null);
  const [paragraphQuestions, setParagraphQuestions] = useState<string[]>([]);
  const [paragraphQuestionsLoading, setParagraphQuestionsLoading] = useState(false);

  // Typewriter state
  const [visibleLength, setVisibleLength] = useState(0);
  const lastScrollTime = useRef(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Voice mode refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackTimeRef = useRef<number>(0);
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([]);

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

  // ===== VOICE MODE LOGIC =====
  const GEMINI_WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

  const drawWaveform = useCallback((analyser: AnalyserNode, canvas: HTMLCanvasElement, color: string) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.beginPath();
      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const stopAllPlayback = useCallback(() => {
    for (const src of playbackSourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    playbackSourcesRef.current = [];
    playbackTimeRef.current = 0;
  }, []);

  const cleanupVoice = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    stopAllPlayback();
    processorRef.current?.disconnect();
    processorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    playbackTimeRef.current = 0;
  }, [stopAllPlayback]);

  const endVoiceSession = useCallback(() => {
    cleanupVoice();
    setVoiceMode("idle");
  }, [cleanupVoice]);

  // Convert float32 audio to int16 PCM
  const float32ToInt16 = (float32: Float32Array): Int16Array => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  };

  // Downsample from source rate to 16kHz
  const downsample = (buffer: Float32Array, fromRate: number): Float32Array => {
    if (fromRate === 16000) return buffer;
    const ratio = fromRate / 16000;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = buffer[Math.round(i * ratio)];
    }
    return result;
  };

  // Convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Play incoming PCM audio chunk in real-time
  const playPcmChunk = useCallback((base64Data: string) => {
    const audioCtx = audioContextRef.current;
    const analyser = analyserRef.current;
    if (!audioCtx || !analyser) return;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);       // for waveform visualization
    source.connect(audioCtx.destination); // for audio output (NOT through analyser)

    const startTime = Math.max(audioCtx.currentTime + 0.05, playbackTimeRef.current);
    source.start(startTime);
    playbackTimeRef.current = startTime + audioBuffer.duration;

    playbackSourcesRef.current.push(source);
    source.onended = () => {
      playbackSourcesRef.current = playbackSourcesRef.current.filter((s) => s !== source);
    };
  }, []);

  const handleMicClick = useCallback(async () => {
    if (voiceMode !== "idle") return;
    setVoiceMode("connecting");

    try {
      // 1. Get API key
      const tokenRes = await fetch("/api/voice");
      const { key } = await tokenRes.json();
      if (!key) throw new Error("No API key");

      // 2. Get mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Set up AudioContext + analyser
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const micSource = audioCtx.createMediaStreamSource(stream);
      micSource.connect(analyser); // waveform visualization

      // 4. Set up ScriptProcessor for PCM capture
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      micSource.connect(processor);
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      // 5. Open WebSocket to Gemini Live API
      const ws = new WebSocket(`${GEMINI_WS_URL}?key=${key}`);
      wsRef.current = ws;

      const hasTools = !!(onFixAll || onExport);
      const toolInstructions = hasTools
        ? ` You have tools available: ${onFixAll ? "fix_all_issues (fixes all flagged contract issues with suggested replacements)" : ""}${onFixAll && onExport ? " and " : ""}${onExport ? "export_contract (exports the contract as a PDF with redlines)" : ""}. When the user asks you to fix issues, fix the contract, clean it up, or similar — call fix_all_issues. When they ask to export, download, send, or share the contract — call export_contract. If they ask to do both, call fix_all_issues first, then export_contract. After calling a tool, briefly confirm what you did.`
        : "";
      const sysInstruction = contractText
        ? `You are Clause, a voice legal assistant. You are reviewing a contract.\n\nRules: Do NOT introduce yourself or greet the user. Do NOT say "sure" or "of course" or any filler. Jump straight to the answer. Keep responses to 1-3 sentences max. Speak naturally and conversationally. Wait for the user to ask before speaking.${toolInstructions}`
        : `You are Clause, a voice legal assistant. Rules: Do NOT introduce yourself or greet the user. Do NOT say "sure" or "of course" or any filler. Jump straight to the answer. Keep responses to 1-3 sentences max. Speak naturally and conversationally. Wait for the user to ask before speaking.${toolInstructions}`;

      let micStarted = false;

      const startMicStreaming = () => {
        if (micStarted) return;
        micStarted = true;
        setVoiceMode("active");
        playbackTimeRef.current = 0;

        if (canvasRef.current) {
          drawWaveform(analyser, canvasRef.current, "rgba(96, 165, 250, 0.8)");
        }

        const sampleRate = audioCtx.sampleRate;
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const downsampled = downsample(inputData, sampleRate);
          const pcm = float32ToInt16(downsampled);
          const base64 = arrayBufferToBase64(pcm.buffer as ArrayBuffer);

          ws.send(JSON.stringify({
            realtimeInput: {
              audio: {
                data: base64,
                mimeType: "audio/pcm;rate=16000",
              },
            },
          }));
        };
      };

      ws.onopen = () => {
        console.log("[Voice] WebSocket connected, sending setup...");
        const toolDeclarations = [];
        if (onFixAll) {
          toolDeclarations.push({
            name: "fix_all_issues",
            description: "Fix all flagged issues in the contract by applying suggested replacement language",
          });
        }
        if (onExport) {
          toolDeclarations.push({
            name: "export_contract",
            description: "Export the contract as a PDF with redlined changes and generate an email draft",
          });
        }

        const setupMsg: Record<string, unknown> = {
          setup: {
            model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
            generationConfig: {
              responseModalities: ["AUDIO"],
            },
            systemInstruction: {
              parts: [{ text: sysInstruction }],
            },
            ...(toolDeclarations.length > 0 && {
              tools: [{ functionDeclarations: toolDeclarations }],
            }),
          },
        };
        ws.send(JSON.stringify(setupMsg));
      };

      ws.onmessage = async (event) => {
        try {
          const text = event.data instanceof Blob
            ? await event.data.text()
            : event.data;
          const msg = JSON.parse(text);
          console.log("[Voice] Received:", Object.keys(msg));

          // Setup complete — start streaming mic audio
          if (msg.setupComplete !== undefined) {
            console.log("[Voice] Setup complete, starting mic streaming");
            startMicStreaming();
            return;
          }

          // Interruption — user started speaking, stop AI playback
          if (msg.serverContent?.interrupted) {
            console.log("[Voice] Interrupted by user");
            stopAllPlayback();
            return;
          }

          // Tool calls — fix all or export
          if (msg.toolCall?.functionCalls) {
            console.log("[Voice] Tool call:", msg.toolCall.functionCalls);
            const functionResponses = [];
            for (const fc of msg.toolCall.functionCalls) {
              if (fc.name === "fix_all_issues" && onFixAll) {
                onFixAll();
                functionResponses.push({ id: fc.id, name: fc.name, response: { result: "All issues have been fixed." } });
              } else if (fc.name === "export_contract" && onExport) {
                onExport();
                functionResponses.push({ id: fc.id, name: fc.name, response: { result: "Contract exported." } });
              }
            }
            // Send tool responses back so the model can confirm
            if (functionResponses.length > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ toolResponse: { functionResponses } }));
            }
            return;
          }

          // Audio response chunks
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                playPcmChunk(part.inlineData.data);
              }
            }
          }
        } catch (e) {
          console.error("[Voice] Message parse error:", e);
        }
      };

      ws.onerror = (e) => {
        console.error("[Voice] WebSocket error:", e);
        setVoiceError("Connection error");
        setVoiceMode("error");
        cleanupVoice();
        setTimeout(() => { setVoiceMode("idle"); setVoiceError(""); }, 2500);
      };

      ws.onclose = (e) => {
        console.log("[Voice] WebSocket closed:", e.code, e.reason);
        setVoiceMode((prev) => prev === "error" ? prev : "idle");
        cancelAnimationFrame(animFrameRef.current);
        processorRef.current?.disconnect();
        processorRef.current = null;
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        audioContextRef.current?.close().catch(() => {});
        audioContextRef.current = null;
      };
    } catch {
      setVoiceError("Microphone access denied");
      setVoiceMode("error");
      cleanupVoice();
      setTimeout(() => { setVoiceMode("idle"); setVoiceError(""); }, 2500);
    }
  }, [voiceMode, contractText, drawWaveform, cleanupVoice, playPcmChunk, stopAllPlayback, onFixAll, onExport]);

  // Close on Escape, open on /
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (voiceMode !== "idle") {
          endVoiceSession();
          return;
        }
        if (isExpanded && !isStreaming) {
          setIsExpanded(false);
          setActiveParagraph(null);
          setParagraphQuestions([]);
          clearTimers();
          setBorderState("leaving");
          timersRef.current.push(setTimeout(() => setBorderState("idle"), 500));
        }
      }
      if (e.key === "/" && !isExpanded && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, isStreaming, voiceMode, endVoiceSession]);

  // Click outside to collapse
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        isExpanded && !isStreaming &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false);
        setActiveParagraph(null);
        setParagraphQuestions([]);
        clearTimers();
        setBorderState("leaving");
        timersRef.current.push(setTimeout(() => setBorderState("idle"), 500));
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isExpanded, isStreaming]);


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
    timersRef.current.push(
      setTimeout(() => {
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

  // Fetch suggested questions for a selected paragraph
  const fetchParagraphQuestions = useCallback(async (paragraph: string) => {
    setParagraphQuestionsLoading(true);
    setParagraphQuestions([]);
    try {
      const res = await fetch("/api/paragraph-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraph, contractText }),
      });
      const data = await res.json();
      setParagraphQuestions(data.questions || []);
    } catch {
      setParagraphQuestions([
        "What does this mean in plain English?",
        "Is this standard contract language?",
        "What risks should I be aware of?",
      ]);
    } finally {
      setParagraphQuestionsLoading(false);
    }
  }, [contractText]);

  // Handle paragraph selection from document viewer
  useEffect(() => {
    if (contextParagraph && !isStreaming) {
      setQuestion("");
      setAnswer("");
      setFollowups([]);
      setVisibleLength(0);
      setActiveParagraph(contextParagraph);
      setIsExpanded(true);
      setBorderState("settled");
      fetchParagraphQuestions(contextParagraph);
      onClearContext?.();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [contextParagraph]);

  const handleSend = useCallback(async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isStreaming) return;

    // Include paragraph context in the message if available
    const messageContent = activeParagraph
      ? `Regarding this specific passage from the contract:\n\n"${activeParagraph}"\n\n${text}`
      : text;

    // Clear paragraph suggestions since we're entering Q&A mode
    if (activeParagraph) {
      setParagraphQuestions([]);
      setParagraphQuestionsLoading(false);
    }

    const userMessage: ChatMessage = { role: "user", content: messageContent };
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
  }, [input, isStreaming, chatHistory, onChatUpdate, contractText, selectedModel, fetchFollowups, activeParagraph]);

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
    if (voiceMode !== "idle") return "0 0 20px rgba(59, 130, 246, 0.2), 0 0 60px rgba(59, 130, 246, 0.08)";
    if (borderSpin) return "0 0 30px rgba(232, 220, 200, 0.2), 0 0 80px rgba(212, 200, 176, 0.1)";
    if (isExpanded) return "0 0 16px rgba(232, 220, 200, 0.12)";
    return "none";
  })();

  const isVoiceActive = voiceMode !== "idle";

  return (
    <div
      ref={panelRef}
      className="fixed bottom-6 z-50"
      style={{
        width: isFocused || isExpanded || isStreaming || isVoiceActive ? "min(720px, 90vw)" : "min(400px, 90vw)",
        left: "50vw",
        transform: "translateX(-50%)",
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
            opacity: borderState === "idle" && !borderSpin && !isVoiceActive ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Voice mode border */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: "1.5px solid rgba(59, 130, 246, 0.6)",
            opacity: isVoiceActive ? 1 : 0,
            transition: "opacity 0.3s ease",
            zIndex: 2,
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
                  {/* Selected paragraph context */}
                  {activeParagraph && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5C5C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C5C5C]">Selected passage</span>
                      </div>
                      <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                        <p className="text-[13px] leading-relaxed text-[#999999] italic line-clamp-4">
                          &ldquo;{activeParagraph}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Suggested questions for paragraph (before user asks) */}
                  {activeParagraph && !question && (
                    <>
                      {paragraphQuestionsLoading ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="flex gap-1">
                            <span className="h-1 w-1 rounded-full bg-[#5C5C5C] animate-pulse" />
                            <span className="h-1 w-1 rounded-full bg-[#5C5C5C] animate-pulse" style={{ animationDelay: "150ms" }} />
                            <span className="h-1 w-1 rounded-full bg-[#5C5C5C] animate-pulse" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-[11px] text-[#5C5C5C]">Generating questions...</span>
                        </div>
                      ) : paragraphQuestions.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C5C5C] mb-0.5">Ask about this passage</span>
                          {paragraphQuestions.map((q, idx) => (
                            <motion.button
                              key={idx}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: idx * 0.07 }}
                              onClick={() => handleSend(q)}
                              className="group flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left transition-all duration-150 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(240,235,227,0.08)] hover:border-[rgba(240,235,227,0.2)]"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0EBE3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                              <span className="text-[13px] text-[#999999] group-hover:text-[#cccccc] transition-colors">{q}</span>
                            </motion.button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}

                  {/* Q&A section (after user asks a question) */}
                  {question && (
                    <>
                      {activeParagraph && <div className="h-px bg-[rgba(255,255,255,0.06)] mb-3" />}

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
                    </>
                  )}
                </div>

                {/* Divider between content and input */}
                <div className="h-px bg-[rgba(255,255,255,0.06)] mx-4" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== INPUT AREA — always at the bottom ===== */}
          <div className="px-4 pt-3 pb-2.5 flex flex-col relative">
            {isVoiceActive ? (
              /* ===== VOICE MODE UI ===== */
              <div
                onClick={endVoiceSession}
                className="flex flex-col items-center justify-center cursor-pointer"
                style={{ minHeight: "56px" }}
              >
                {voiceMode === "error" ? (
                  <span className="text-xs text-red-400">{voiceError}</span>
                ) : voiceMode === "connecting" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-blue-300/60">Connecting...</span>
                  </div>
                ) : (
                  <>
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={48}
                      className="w-full"
                      style={{ height: "48px" }}
                    />
                    <span className="text-[10px] text-blue-300/40 mt-1">Tap to end</span>
                  </>
                )}
              </div>
            ) : (
              <>
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
                    placeholder={activeParagraph && !question ? "Ask about this passage..." : placeholder}
                    rows={1}
                    className={`w-full bg-transparent text-sm focus:outline-none focus:ring-0 border-none outline-none resize-none overflow-y-auto transition-colors duration-200 ${isFocused ? "ai-placeholder-bright" : "ai-placeholder-dim"}`}
                    style={{ boxShadow: "none", WebkitAppearance: "none", color: isFocused ? "#ffffff" : "rgba(234, 234, 240, 0.6)" }}
                  />
                )}

                {/* Send/Close + Mic */}
                <div className="flex justify-between items-center gap-1.5 mt-1">
                  {/* Left: close button when expanded */}
                  <div>
                    {isExpanded && !isStreaming && (
                      <button
                        onClick={() => { setIsExpanded(false); setActiveParagraph(null); setParagraphQuestions([]); clearTimers(); setBorderState("leaving"); timersRef.current.push(setTimeout(() => setBorderState("idle"), 500)); }}
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
                    {/* Mic button */}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleMicClick}
                      disabled={isStreaming}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                      style={{
                        background: isFocused ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.04)",
                        color: isFocused ? "rgba(255, 255, 255, 0.55)" : "rgba(255, 255, 255, 0.25)",
                        border: isFocused ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="1" width="6" height="12" rx="3" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </button>

                    {/* Ask button */}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
