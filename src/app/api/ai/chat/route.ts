import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is not configured in .env.local.");
    }

    // Map messages to Gemini contents format
    const contents = messages.map((m: any) => {
      const role = m.role === "assistant" ? "model" : "user";
      return {
        role,
        parts: [{ text: m.content }]
      };
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?key=${apiKey}&alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents,
          systemInstruction: context
            ? {
                parts: [{ text: context }]
              }
            : undefined,
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.7
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${errText}`);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed.startsWith("data:")) {
                const dataStr = trimmed.slice(5).trim();
                try {
                  const parsed = JSON.parse(dataStr);
                  const textDelta = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (textDelta) {
                    controller.enqueue(new TextEncoder().encode(textDelta));
                  }
                } catch (e) {
                  // Partial chunk or non-JSON - ignore
                }
              }
            }
          }
        } catch (e) {
          controller.error(e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });

  } catch (err: any) {
    console.error("AI Chat API route error:", err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
