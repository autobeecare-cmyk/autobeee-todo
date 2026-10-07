// src/app/api/ai/chat/route.ts — AutoBee Intelligence Streaming API Route
import { NextResponse } from "next/server";
import {
  streamGeminiWithFallback,
  createCleanTextStream,
  GeminiServiceError,
} from "@/lib/ai/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        {
          error: {
            type: "bad_request",
            message: "Invalid request: messages array is required.",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const { messages, context } = body;

    // Format messages for Gemini API
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: String(m.content || "") }],
    }));

    const systemInstruction = context
      ? {
          parts: [{ text: String(context) }],
        }
      : undefined;

    // Call Gemini with model fallback chain
    const { response: geminiResponse, modelUsed } =
      await streamGeminiWithFallback({
        contents,
        systemInstruction,
        generationConfig: {
          maxOutputTokens: 1800,
          temperature: 0.7,
        },
      });

    const cleanStream = createCleanTextStream(geminiResponse);

    return new Response(cleanStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-AI-Model": modelUsed,
      },
    });
  } catch (err: any) {
    console.error("[AI Chat API Route Error]:", err);

    if (err instanceof GeminiServiceError) {
      return NextResponse.json(
        {
          error: {
            type: err.type,
            message: err.userMessage,
            retryable: err.retryable,
          },
        },
        { status: err.status }
      );
    }

    return NextResponse.json(
      {
        error: {
          type: "unknown",
          message: "AutoBee Intelligence is temporarily unavailable. Please try again.",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
