import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { question, answer, contractText } = await req.json();

    const contextHint = contractText
      ? "The user is analyzing a specific legal contract."
      : "The user is asking general legal questions.";

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `You generate follow-up questions for a legal AI assistant. ${contextHint} Given the user's question and the assistant's answer, suggest exactly 3 short, natural follow-up questions the user might want to ask next. Each should be under 60 characters. Return ONLY a JSON array of 3 strings, no other text.`,
      messages: [
        {
          role: "user",
          content: `Question: "${question}"\n\nAnswer: "${answer.slice(0, 500)}"`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const followups = JSON.parse(match[0]);
      return NextResponse.json({ followups });
    }

    return NextResponse.json({
      followups: [
        "Can you explain this in simpler terms?",
        "What are the key risks here?",
        "What would you recommend instead?",
      ],
    });
  } catch (error) {
    console.error("Followups error:", error);
    return NextResponse.json({
      followups: [
        "Can you explain this in simpler terms?",
        "What are the key risks here?",
        "What would you recommend instead?",
      ],
    });
  }
}
