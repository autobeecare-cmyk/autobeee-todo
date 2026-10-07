// src/lib/ai/gemini.ts — Robust Server-Side Gemini AI Service
// Handles model fallback chain, exponential backoff, SSE buffering, and classified error handling.

export const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
] as const;

export type GeminiModelName = (typeof GEMINI_MODELS)[number];

export type GeminiErrorType =
  | "missing_key"
  | "auth"
  | "not_found"
  | "rate_limit"
  | "unavailable"
  | "timeout"
  | "network"
  | "bad_request"
  | "unknown";

export class GeminiServiceError extends Error {
  constructor(
    public type: GeminiErrorType,
    public status: number,
    public userMessage: string,
    public retryable: boolean,
    public details?: string
  ) {
    super(userMessage);
    this.name = "GeminiServiceError";
  }
}

export function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new GeminiServiceError(
      "missing_key",
      500,
      "AI configuration error: Server environment variable GEMINI_API_KEY is not configured.",
      false
    );
  }
  return apiKey.trim();
}

export function parseGeminiError(status: number, rawBody: string): GeminiServiceError {
  let message = "";
  try {
    const parsed = JSON.parse(rawBody);
    message = parsed.error?.message || "";
  } catch {
    message = rawBody.slice(0, 300);
  }

  if (status === 401 || status === 403) {
    return new GeminiServiceError(
      "auth",
      status,
      "AI authentication failed. Please verify the server GEMINI_API_KEY configuration.",
      false,
      message
    );
  }

  if (status === 404) {
    return new GeminiServiceError(
      "not_found",
      404,
      "The requested AI model was not found.",
      true,
      message
    );
  }

  if (status === 429) {
    return new GeminiServiceError(
      "rate_limit",
      429,
      "AI rate limit reached. Please wait a moment and try again.",
      true,
      message
    );
  }

  if (status === 503) {
    return new GeminiServiceError(
      "unavailable",
      503,
      "AI service is temporarily experiencing high demand. Please try again shortly.",
      true,
      message
    );
  }

  if (status === 400) {
    return new GeminiServiceError(
      "bad_request",
      400,
      "The AI request was malformed or exceeded context limits.",
      false,
      message
    );
  }

  return new GeminiServiceError(
    "unknown",
    status,
    "AI service encountered a temporary error. Please try again.",
    status >= 500,
    message
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface GeminiRequestOptions {
  contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }>;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    responseMimeType?: string;
    responseSchema?: any;
  };
}

/**
 * Execute Gemini streaming request with model fallback chain and backoff retry.
 */
export async function streamGeminiWithFallback(
  options: GeminiRequestOptions,
  timeoutMs = 30000
): Promise<{ response: Response; modelUsed: GeminiModelName }> {
  const apiKey = getGeminiApiKey();
  let lastError: GeminiServiceError | null = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: options.contents,
            systemInstruction: options.systemInstruction,
            generationConfig: options.generationConfig || {
              maxOutputTokens: 1500,
              temperature: 0.7,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          return { response: res, modelUsed: model };
        }

        const errorText = await res.text();
        const classified = parseGeminiError(res.status, errorText);
        lastError = classified;

        if (classified.status === 404) {
          console.warn(`[Gemini] Model ${model} 404 not found. Trying next fallback...`);
          break;
        }

        // On 429 quota exhaustion, immediately cascade to next model rather than sleeping
        if (classified.status === 429) {
          console.warn(`[Gemini] Model ${model} returned 429 (quota/rate limit). Cascading immediately to next fallback...`);
          break;
        }

        if (classified.retryable && attempt === 1) {
          console.warn(
            `[Gemini] Model ${model} returned ${classified.status}. Retrying after 800ms...`
          );
          await sleep(800);
          continue;
        }

        console.warn(`[Gemini] Model ${model} failed with ${classified.status}. Cascading...`);
        break;
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (err.name === "AbortError") {
          lastError = new GeminiServiceError(
            "timeout",
            504,
            "AI request timed out after 30 seconds. Please try again.",
            true
          );
        } else {
          lastError = new GeminiServiceError(
            "network",
            502,
            "Network connection to AI service failed. Please check your internet connection.",
            true,
            err.message
          );
        }

        if (attempt === 1) {
          await sleep(500);
          continue;
        }
        break;
      }
    }
  }

  throw (
    lastError ||
    new GeminiServiceError(
      "unavailable",
      503,
      "All AI models are currently unavailable. Please try again shortly.",
      true
    )
  );
}

/**
 * Non-streaming one-shot Gemini request with fallback chain.
 */
export async function generateGeminiWithFallback(
  options: GeminiRequestOptions,
  timeoutMs = 25000
): Promise<{ text: string; modelUsed: GeminiModelName }> {
  const apiKey = getGeminiApiKey();
  let lastError: GeminiServiceError | null = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: options.contents,
            systemInstruction: options.systemInstruction,
            generationConfig: options.generationConfig || {
              maxOutputTokens: 600,
              temperature: 0.7,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return { text, modelUsed: model };
        }

        const errorText = await res.text();
        const classified = parseGeminiError(res.status, errorText);
        lastError = classified;

        if (classified.status === 404) break;
        if (classified.status === 429) {
          console.warn(`[Gemini] Model ${model} returned 429. Cascading to next fallback...`);
          break;
        }
        if (classified.retryable && attempt === 1) {
          await sleep(600);
          continue;
        }
        break;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = new GeminiServiceError(
          err.name === "AbortError" ? "timeout" : "network",
          err.name === "AbortError" ? 504 : 502,
          "AI request timed out or connection was interrupted.",
          true,
          err.message
        );
        if (attempt === 1) {
          await sleep(500);
          continue;
        }
        break;
      }
    }
  }

  throw (
    lastError ||
    new GeminiServiceError(
      "unavailable",
      503,
      "AI service is temporarily unavailable. Please try again shortly.",
      true
    )
  );
}

/**
 * Robust SSE Stream Reader that preserves chunk buffer state across reads.
 */
export function createCleanTextStream(
  geminiResponse: Response
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const rawReader = geminiResponse.body?.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!rawReader) {
        controller.close();
        return;
      }

      let buffer = "";

      try {
        while (true) {
          const { done, value } = await rawReader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data:")) {
              continue;
            }

            const payloadStr = trimmed.slice(5).trim();
            if (payloadStr === "[DONE]") {
              continue;
            }

            try {
              const data = JSON.parse(payloadStr);
              const textDelta = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textDelta) {
                controller.enqueue(encoder.encode(textDelta));
              }

              if (data.promptFeedback?.blockReason) {
                const reason = data.promptFeedback.blockReason;
                controller.enqueue(
                  encoder.encode(`\n\n[Notice: Output adjusted per policy: ${reason}]`)
                );
              }
            } catch {
              // Incomplete JSON fragment in chunk — buffer will resolve
            }
          }
        }

        // Flush remaining buffer if complete
        if (buffer.trim().startsWith("data:")) {
          try {
            const data = JSON.parse(buffer.trim().slice(5).trim());
            const textDelta = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textDelta) {
              controller.enqueue(encoder.encode(textDelta));
            }
          } catch {}
        }
      } catch (err: any) {
        console.error("[Gemini Stream Controller Error]:", err);
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
}
