import { NextRequest } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function getSystemInstruction(contractText?: string): string {
  if (contractText) {
    return `You are Clause, an AI legal assistant for small business owners. You are reviewing a contract with the user. Here is the contract text:\n\n${contractText}\n\nAnswer questions about this contract clearly and directly in plain English. Keep responses concise — you are speaking aloud, so be conversational. You are not a lawyer and cannot provide legal advice.`;
  }
  return `You are Clause, an AI legal assistant for small business owners. You help small business owners understand legal concepts, contracts, and their rights in plain English. Keep responses concise — you are speaking aloud, so be conversational. You are not a lawyer and cannot provide legal advice.`;
}

function buildWav(pcmData: Buffer): Buffer {
  const header = Buffer.alloc(44);
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const contractText = formData.get("contractText") as string | null;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const base64Audio = audioBuffer.toString("base64");

    const responseChunks: string[] = [];
    let sessionDone = false;
    let sessionError: string | null = null;

    const session = await ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: {
          parts: [{ text: getSystemInstruction(contractText || undefined) }],
        },
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Live session opened");
        },
        onmessage: (message: any) => {
          if (message.data) {
            responseChunks.push(message.data);
          }
          if (message.serverContent?.turnComplete) {
            sessionDone = true;
          }
        },
        onerror: (e: any) => {
          console.error("Gemini Live error:", e);
          sessionError = e?.message || "Unknown error";
          sessionDone = true;
        },
        onclose: () => {
          sessionDone = true;
        },
      },
    });

    // Send the recorded audio
    session.sendRealtimeInput({
      audio: {
        data: base64Audio,
        mimeType: audioFile.type || "audio/webm",
      },
    });

    // Signal turn complete so model generates response
    session.sendClientContent({ turnComplete: true });

    // Wait for response (timeout 30s)
    const startTime = Date.now();
    while (!sessionDone && Date.now() - startTime < 30000) {
      await new Promise((r) => setTimeout(r, 100));
    }

    session.close();

    if (sessionError) {
      return new Response(JSON.stringify({ error: sessionError }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (responseChunks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No audio response received" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const pcmBuffers = responseChunks.map((chunk) =>
      Buffer.from(chunk, "base64")
    );
    const pcmData = Buffer.concat(pcmBuffers);
    const wavBuffer = buildWav(pcmData);

    return new Response(new Uint8Array(wavBuffer), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wavBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Voice error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process voice" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
