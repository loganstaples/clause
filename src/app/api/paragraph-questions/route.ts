import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { paragraph, contractText } = await req.json();

    const contextHint = contractText
      ? "The user is reviewing a legal contract."
      : "";

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `You generate questions for a legal AI assistant. ${contextHint} The user has selected a specific paragraph from a contract to learn more about. Generate exactly 3 concise, practical questions they might want to ask about this paragraph. Each question should be under 60 characters and be specific to the content. Return ONLY a JSON array of 3 strings, no other text.`,
      messages: [
        {
          role: "user",
          content: `Selected paragraph:\n\n"${paragraph.slice(0, 1000)}"`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const questions = JSON.parse(match[0]);
      return NextResponse.json({ questions });
    }

    return NextResponse.json({
      questions: [
        "What does this mean in plain English?",
        "Is this standard contract language?",
        "What risks should I be aware of?",
      ],
    });
  } catch (error) {
    console.error("Paragraph questions error:", error);
    return NextResponse.json({
      questions: [
        "What does this mean in plain English?",
        "Is this standard contract language?",
        "What risks should I be aware of?",
      ],
    });
  }
}
