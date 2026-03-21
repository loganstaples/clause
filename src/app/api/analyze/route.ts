import { NextRequest, NextResponse } from "next/server";
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
- An overall risk score from 0-100 (100 = extremely unfavorable)
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

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "No contract text provided" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Please analyze this contract:\n\n${text}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Try to parse JSON, with fallback for markdown-wrapped responses
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch {
      // Try stripping markdown code blocks
      const cleaned = responseText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      analysis = JSON.parse(cleaned);
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze contract" },
      { status: 500 }
    );
  }
}
