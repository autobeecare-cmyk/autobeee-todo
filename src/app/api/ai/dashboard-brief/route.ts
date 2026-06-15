import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { tasks, goals, expenses, currentUser } = await req.json();

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is not configured in .env.local.");
    }

    const systemInstruction = `You are a productivity assistant for a 3-person startup team (Sourabh, Asher, Subin). 
Be brutally concise. 2-3 sentences max. Highlight what's urgent or overdue. 
Mention money only if something notable (high spend, renewal due). 
Never use bullet points. Write like a smart colleague, not a robot.`;

    const promptText = `Current user: ${currentUser || "Sourabh"}
Tasks: ${JSON.stringify(tasks?.slice(0, 20))}
Goals: ${JSON.stringify(goals?.slice(0, 5))}
Recent expenses (last 10): ${JSON.stringify(expenses?.slice(0, 10))}

Give a 2-3 sentence focus brief for today.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: promptText }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to query Gemini API");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "All clear — nothing urgent today.";
    return NextResponse.json({ brief: text });
  } catch (err: any) {
    console.error("Dashboard Brief API error:", err);
    return NextResponse.json({ brief: "All clear — nothing urgent today." });
  }
}
