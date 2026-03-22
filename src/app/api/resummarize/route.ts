import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { contractText, riskScore } = await req.json();

  if (!contractText) {
    return NextResponse.json(
      { error: "No contract text provided" },
      { status: 400 }
    );
  }

  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are an expert contract attorney. This contract has been revised and all previously identified issues have been addressed. The current favorability score is ${riskScore}/100.

Write ONE sentence summarizing the contract's overall favorability for the small business owner, reflecting that revisions have been applied and the contract is now in stronger shape. Be specific about the contract type if you can tell. Do NOT mention the score number.

Contract text:
${contractText.slice(0, 3000)}`,
        },
      ],
    });

    const summary =
      res.content[0].type === "text" ? res.content[0].text.trim() : "";

    return NextResponse.json({ summary });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
