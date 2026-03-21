"use client";

import { useState, useEffect } from "react";
import { ContractAnalysis, Clause } from "./types";

interface StreamingState {
  /** null = not started, "streaming" = in progress, "done" = complete, "error" = failed */
  status: null | "streaming" | "done" | "error";
  /** AI-generated title arrives early */
  title: string | null;
  /** Header fields arrive first */
  header: {
    riskScore: number;
    summary: string;
    counts: { critical: number; warning: number; info: number };
  } | null;
  /** Clauses arrive one by one */
  clauses: Clause[];
  /** Error message if status === "error" */
  error: string | null;
}

export function useStreamingAnalysis(
  contractText: string | null,
  shouldStream: boolean,
  retryKey: number = 0
): {
  state: StreamingState;
  analysis: ContractAnalysis | null;
} {
  const [state, setState] = useState<StreamingState>({
    status: null,
    title: null,
    header: null,
    clauses: [],
    error: null,
  });

  useEffect(() => {
    if (!shouldStream || !contractText) return;

    setState({ status: "streaming", title: null, header: null, clauses: [], error: null });

    const abortController = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: contractText }),
          signal: abortController.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Failed to start analysis stream");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (eventType === "title") {
                setState((prev) => ({ ...prev, title: data.title }));
              } else if (eventType === "header") {
                setState((prev) => ({ ...prev, header: data }));
              } else if (eventType === "clause") {
                setState((prev) => ({
                  ...prev,
                  clauses: [...prev.clauses, data as Clause],
                }));
              } else if (eventType === "done") {
                setState((prev) => ({ ...prev, status: "done" }));
              } else if (eventType === "error") {
                setState((prev) => ({
                  ...prev,
                  status: "error",
                  error: data.message,
                }));
              }
              eventType = "";
            }
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setState((prev) => ({
            ...prev,
            status: "error",
            error:
              err instanceof Error ? err.message : "Analysis failed",
          }));
        }
      }
    })();

    return () => abortController.abort();
  }, [shouldStream, contractText, retryKey]);

  const analysis: ContractAnalysis | null =
    state.status === "done" && state.header
      ? {
          riskScore: state.header.riskScore,
          summary: state.header.summary,
          counts: state.header.counts,
          clauses: state.clauses,
        }
      : null;

  return { state, analysis };
}
