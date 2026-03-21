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

export const maxDuration = 120;

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Fire title generation and analysis in parallel
        const titlePromise = client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 50,
          messages: [
            {
              role: "user",
              content: `Read this contract and return ONLY a short, professional title for it (e.g. "Commercial Office Lease Agreement" or "Master Services Agreement — Acme Corp"). No quotes, no explanation, just the title.\n\n${text.slice(0, 2000)}`,
            },
          ],
        });

        // Start analysis stream
        let fullText = "";
        let headerEmitted = false;
        let inClausesArray = false;
        let braceDepth = 0;
        let clauseStart = -1;

        const claudeStream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 16384,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: `Please analyze this contract:\n\n${text}` },
          ],
        });

        // Emit title as soon as it arrives (runs in parallel with analysis)
        titlePromise.then((titleRes) => {
          const title = titleRes.content[0].type === "text"
            ? titleRes.content[0].text.trim().replace(/^["']|["']$/g, "")
            : "";
          if (title) {
            controller.enqueue(
              encoder.encode(`event: title\ndata: ${JSON.stringify({ title })}\n\n`)
            );
          }
        }).catch(() => {});

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;

            // Try to emit header as soon as we see "clauses" key
            if (!headerEmitted && fullText.includes('"clauses"')) {
              try {
                // Extract header by closing the object early
                const headerJson = fullText.slice(0, fullText.indexOf('"clauses"')) + '"clauses":[]}';
                const parsed = JSON.parse(headerJson);
                controller.enqueue(
                  encoder.encode(`event: header\ndata: ${JSON.stringify({
                    riskScore: parsed.riskScore,
                    summary: parsed.summary,
                    counts: parsed.counts,
                  })}\n\n`)
                );
                headerEmitted = true;
              } catch {
                // Header not yet parseable, keep buffering
              }
            }

            // Incremental clause detection: track brace depth inside the clauses array
            if (headerEmitted) {
              const clausesIdx = fullText.indexOf('"clauses"');
              const arrayStart = fullText.indexOf('[', clausesIdx);
              if (arrayStart !== -1) {
                // Scan only newly added characters for efficiency
                const scanFrom = Math.max(
                  arrayStart + 1,
                  fullText.length - event.delta.text.length
                );
                for (let i = scanFrom; i < fullText.length; i++) {
                  const ch = fullText[i];
                  // Skip characters inside strings
                  if (ch === '"') {
                    // Fast-forward past string content
                    i++;
                    while (i < fullText.length && fullText[i] !== '"') {
                      if (fullText[i] === '\\') i++; // skip escaped char
                      i++;
                    }
                    continue;
                  }
                  if (ch === '{') {
                    if (braceDepth === 0) clauseStart = i;
                    braceDepth++;
                  } else if (ch === '}') {
                    braceDepth--;
                    if (braceDepth === 0 && clauseStart !== -1) {
                      // Complete clause object found
                      const clauseJson = fullText.slice(clauseStart, i + 1);
                      try {
                        const clause = JSON.parse(clauseJson);
                        controller.enqueue(
                          encoder.encode(`event: clause\ndata: ${JSON.stringify(clause)}\n\n`)
                        );
                      } catch {
                        // Malformed clause, skip
                      }
                      clauseStart = -1;
                    }
                  }
                }
              }
            }
          }
        }

        // Wait for title to finish
        await titlePromise.catch(() => {});

        // If header was never emitted (short response), try full parse as fallback
        if (!headerEmitted) {
          let analysis;
          try {
            analysis = JSON.parse(fullText);
          } catch {
            const cleaned = fullText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
            analysis = JSON.parse(cleaned);
          }
          controller.enqueue(
            encoder.encode(`event: header\ndata: ${JSON.stringify({
              riskScore: analysis.riskScore,
              summary: analysis.summary,
              counts: analysis.counts,
            })}\n\n`)
          );
          for (const clause of analysis.clauses) {
            controller.enqueue(
              encoder.encode(`event: clause\ndata: ${JSON.stringify(clause)}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("Analysis streaming error:", errMsg);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: errMsg })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
