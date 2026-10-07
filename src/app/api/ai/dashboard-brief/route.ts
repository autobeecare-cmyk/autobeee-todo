// src/app/api/ai/dashboard-brief/route.ts — AI Briefing Endpoint
import { NextResponse } from "next/server";
import { generateGeminiWithFallback, GeminiServiceError } from "@/lib/ai/gemini";

export async function POST(req: Request) {
  try {
    const { tasks, goals, expenses, meetings, currentUser } = await req.json().catch(() => ({}));

    const systemInstruction = {
      parts: [
        {
          text: `You are AutoBee's Chief of Staff and AI Founder Copilot for Sourabh and Asher.
Be direct, executive, concise, and numbers-focused.
Limit response to 2-3 high-impact sentences.
Surface immediate priority bottlenecks, upcoming commitments, or runway status.
No conversational filler. Write like an experienced startup co-founder.`,
        },
      ],
    };

    const promptText = `Current Founder: ${currentUser || "Sourabh"}
Open Tasks: ${JSON.stringify((tasks || []).slice(0, 15))}
Active Goals: ${JSON.stringify((goals || []).slice(0, 5))}
Recent Expenses: ${JSON.stringify((expenses || []).slice(0, 5))}
Upcoming Meetings: ${JSON.stringify((meetings || []).slice(0, 3))}

Provide today's executive focus brief.`;

    const { text, modelUsed } = await generateGeminiWithFallback({
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }],
        },
      ],
      systemInstruction,
      generationConfig: {
        maxOutputTokens: 250,
        temperature: 0.6,
      },
    });

    const brief = text.trim() || "All systems operational. Review today's priority tasks and upcoming milestones.";

    return NextResponse.json({ brief, model: modelUsed });
  } catch (err: any) {
    console.error("[Dashboard Brief API Error]:", err);

    if (err instanceof GeminiServiceError) {
      return NextResponse.json({
        brief: "All systems operational. Focus on key objectives for today.",
        warning: err.userMessage,
      });
    }

    return NextResponse.json({
      brief: "All systems operational. Review today's priority tasks and upcoming milestones.",
    });
  }
}
