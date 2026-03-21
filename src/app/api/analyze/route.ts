import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert contract attorney analyzing a contract on behalf of a small business owner. Your job is to identify every clause that is unfavorable, risky, or unusual compared to market-standard terms.

For each flagged clause, provide:
1. A severity level: "critical", "warning", or "info"
2. A short plain-English title (e.g., "Personal Liability Guarantee")
3. The exact text from the contract that constitutes this clause (copy it verbatim — this will be used for text matching)
4. A section/page reference if identifiable
5. A plain-English explanation (2-3 sentences, written for someone with no legal background)
6. What a Fortune 500 company's legal team would do about this clause (2-3 sentences)
7. Suggested replacement language that would be more favorable to the small business owner

Also provide:
- An overall contract quality score from 0-100 (100 = excellent deal, very fair to the small business owner; 0 = extremely unfavorable). Score higher when terms are balanced and standard, lower when there are many unfavorable or risky clauses.
- A one-sentence summary of the contract's overall fairness
- Counts of critical, warning, and info-level clauses

Return your response as valid JSON matching this exact schema:
{
  "riskScore": number,
  "summary": string,
  "counts": { "critical": number, "warning": number, "info": number },
  "clauses": [
    {
      "id": string,
      "severity": "critical" | "warning" | "info",
      "title": string,
      "originalText": string,
      "location": string,
      "explanation": string,
      "corporateBenchmark": string,
      "suggestedReplacement": string
    }
  ]
}

Respond with ONLY the JSON object. No preamble, no markdown, no backticks.`;

// Use Node.js runtime — the edge runtime simulation in the dev server
// buffers the entire response before forwarding to the browser.
export const maxDuration = 120;

/**
 * Convert an async iterator into a ReadableStream using pull().
 * Each iterator value becomes one HTTP chunk flushed to the client.
 */
function iteratorToStream(
  iterator: AsyncIterator<Uint8Array>
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

/**
 * Async generator that yields SSE event chunks.
 * Each yield = one flushed chunk to the browser.
 */
async function* generateSSEEvents(
  text: string
): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder();

  // Flush a large initial chunk to prime the HTTP pipe.
  // Browsers/proxies/runtimes often buffer small initial writes;
  // a ~4 KB SSE comment forces the buffer to flush and establishes
  // the streaming connection before real data arrives.
  yield encoder.encode(`: ${"x".repeat(4096)}\n\n`);

  try {
    // Fire title generation in parallel
    let titleEmitted = false;
    let titleText = "";
    let titleDone = false;

    const titlePromise = client.messages
      .create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: `Read this contract and return ONLY a short, professional title for it (e.g. "Commercial Office Lease Agreement" or "Master Services Agreement — Acme Corp"). No quotes, no explanation, just the title.\n\n${text.slice(0, 2000)}`,
          },
        ],
      })
      .then((res) => {
        titleDone = true;
        titleText =
          res.content[0].type === "text"
            ? res.content[0].text.trim().replace(/^["']|["']$/g, "")
            : "";
      })
      .catch(() => {
        titleDone = true;
      });

    // Start analysis stream
    let fullText = "";
    let jsonStartIdx = -1; // Position of the opening { (skips ```json preamble)
    let headerEmitted = false;
    let scanPos = -1;
    let braceDepth = 0;
    let clauseStart = -1;
    let inString = false;
    let escapeNext = false;
    const emittedClauseIds = new Set<string>();

    const claudeStream = client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Please analyze this contract:\n\n${text}` },
      ],
    });

    for await (const event of claudeStream) {
      // Check if title arrived from parallel request
      if (!titleEmitted && titleDone && titleText) {
        yield encoder.encode(
          `event: title\ndata: ${JSON.stringify({ title: titleText })}\n\n`
        );
        titleEmitted = true;
      }

      if (
        event.type !== "content_block_delta" ||
        event.delta.type !== "text_delta"
      ) {
        continue;
      }

      fullText += event.delta.text;

      // Track where the actual JSON object starts (skip ```json preamble)
      if (jsonStartIdx === -1) {
        const bracePos = fullText.indexOf("{");
        if (bracePos !== -1) jsonStartIdx = bracePos;
      }

      // Emit header as soon as we see the "clauses" JSON key.
      // Use a regex to match the actual key pattern ("clauses": [)
      // instead of indexOf, which false-matches "clauses" inside
      // string values like the summary.
      if (!headerEmitted && jsonStartIdx >= 0) {
        const clausesKeyMatch = fullText.match(/"clauses"\s*:\s*\[/);
        if (clausesKeyMatch && clausesKeyMatch.index !== undefined) {
          try {
            // Slice from the JSON start (skipping any ```json preamble)
            const headerJson =
              fullText.slice(jsonStartIdx, clausesKeyMatch.index) +
              '"clauses":[]}';
            const parsed = JSON.parse(headerJson);

            yield encoder.encode(
              `event: header\ndata: ${JSON.stringify({
                riskScore: parsed.riskScore,
                summary: parsed.summary,
                counts: parsed.counts,
              })}\n\n`
            );
            headerEmitted = true;

            const arrayStart = fullText.indexOf("[", clausesKeyMatch.index);
            if (arrayStart !== -1) scanPos = arrayStart + 1;
          } catch {
            // Header not yet parseable
          }
        }
      }

      // Incremental clause detection
      if (headerEmitted && scanPos >= 0) {
        for (let i = scanPos; i < fullText.length; i++) {
          const ch = fullText[i];

          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (inString) {
            if (ch === "\\") escapeNext = true;
            else if (ch === '"') inString = false;
            continue;
          }
          if (ch === '"') {
            inString = true;
            continue;
          }

          if (ch === "{") {
            if (braceDepth === 0) clauseStart = i;
            braceDepth++;
          } else if (ch === "}") {
            braceDepth--;
            if (braceDepth === 0 && clauseStart !== -1) {
              const clauseJson = fullText.slice(clauseStart, i + 1);
              try {
                const clause = JSON.parse(clauseJson);

                yield encoder.encode(
                  `event: clause\ndata: ${JSON.stringify(clause)}\n\n`
                );
                if (clause.id) emittedClauseIds.add(clause.id);
              } catch {
                // Malformed clause, skip
              }
              clauseStart = -1;
            }
          }
        }
        scanPos = fullText.length;
      }
    }


    // Emit title if it hadn't arrived during the analysis loop
    await titlePromise;
    if (!titleEmitted && titleText) {
      yield encoder.encode(
        `event: title\ndata: ${JSON.stringify({ title: titleText })}\n\n`
      );
    }

    // Fallback: full-parse and emit anything the incremental scanner missed
    try {
      let analysis;
      try {
        analysis = JSON.parse(fullText);
      } catch {
        const cleaned = fullText
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        analysis = JSON.parse(cleaned);
      }

      if (!headerEmitted) {
        yield encoder.encode(
          `event: header\ndata: ${JSON.stringify({
            riskScore: analysis.riskScore,
            summary: analysis.summary,
            counts: analysis.counts,
          })}\n\n`
        );
      }

      for (const clause of analysis.clauses) {
        if (!emittedClauseIds.has(clause.id)) {
          yield encoder.encode(
            `event: clause\ndata: ${JSON.stringify(clause)}\n\n`
          );
        }
      }
    } catch {
      // Whatever was incrementally emitted is all we have
    }

    yield encoder.encode(`event: done\ndata: {}\n\n`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Analysis streaming error:", errMsg);
    yield encoder.encode(
      `event: error\ndata: ${JSON.stringify({ message: errMsg })}\n\n`
    );
  }
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ message: "No contract text provided" })}\n\n`,
      {
        status: 400,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  const stream = iteratorToStream(generateSSEEvents(text));

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
