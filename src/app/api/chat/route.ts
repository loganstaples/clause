import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

function getSystemPrompt(contractText?: string): string {
  if (contractText) {
    return `You are Clause, an AI legal assistant for small business owners. You are currently reviewing a contract with the user. Here is the full contract text:

<contract>
${contractText}
</contract>

Answer the user's questions about this contract clearly and directly. Use plain English. When referencing specific sections, quote the relevant text briefly. If asked to rewrite a clause, provide the exact legal language they could propose. If asked about enforceability, note the relevant jurisdiction.

Keep your responses concise but thorough. Use short paragraphs.

You are not a lawyer and cannot provide legal advice. You provide legal information and analysis. Always recommend consulting with a licensed attorney for final decisions.`;
  }

  return `You are Clause, an AI legal assistant for small business owners. You help small business owners understand legal concepts, contracts, and their rights in plain English.

Answer questions clearly and directly. Use plain English — avoid unnecessary legal jargon. When you must use a legal term, explain it. Keep responses concise but thorough.

You are not a lawyer and cannot provide legal advice. You provide legal information and analysis. Always recommend consulting with a licensed attorney for final decisions.`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, contractText, model } = await req.json();

    const ALLOWED_MODELS = [
      "claude-haiku-4-5-20251001",
      "claude-sonnet-4-6",
      "claude-opus-4-6",
    ];
    const chatModel = ALLOWED_MODELS.includes(model)
      ? model
      : "claude-haiku-4-5-20251001";

    const stream = await client.messages.stream({
      model: chatModel,
      max_tokens: 2048,
      system: getSystemPrompt(contractText),
      messages: messages.map(
        (m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })
      ),
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(
                encoder.encode(`data: ${data}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
