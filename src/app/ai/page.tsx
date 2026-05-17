"use client";
// src/app/ai/page.tsx — AI Assistant (Gemini-powered)
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, Loader2, RefreshCw } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useIdeaStore } from "@/store/useIdeaStore";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, Goal, Expense, Idea } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "What should we focus on today?",
  "Where are we wasting money?",
  "What task is blocking progress?",
  "Summarize this week",
  "What are our top priorities?",
  "Analyze our spending patterns",
  "Suggest cost reductions",
  "What long-term ideas should we explore?",
];

function buildContext(tasks: Task[], goals: Goal[], expenses: Expense[], ideas: Idea[]) {
  const now = new Date();
  const openTasks = tasks.filter(t => t.status !== "done");
  const urgentTasks = tasks.filter(t => t.priority === "urgent" && t.status !== "done");
  const activeGoals = goals.filter(g => g.status === "active");
  const monthExpenses = expenses.filter(e =>
    isWithinInterval(parseISO(e.date), { start: startOfMonth(now), end: endOfMonth(now) })
  );
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  return `
You are an AI assistant for Autobee, a 3-person startup (Sourabh, Asher, Subin). You help with startup operations, task prioritization, and financial insights.

Current date: ${format(now, "d MMMM yyyy")}

TASKS OVERVIEW:
- Total tasks: ${tasks.length}
- Open tasks: ${openTasks.length}
- Done tasks: ${tasks.filter(t => t.status === "done").length}
- Urgent tasks: ${urgentTasks.map(t => `"${t.title}" (${t.assignee})`).join(", ") || "None"}
- Top open tasks: ${openTasks.slice(0, 5).map(t => `"${t.title}" [${t.priority}] → ${t.assignee}`).join(", ") || "None"}

GOALS:
- Active goals: ${activeGoals.map(g => `"${g.title}" at ${g.progress}%`).join(", ") || "None"}
- Completed goals: ${goals.filter(g => g.status === "completed").length}

EXPENSES THIS MONTH:
- Total: ₹${monthTotal.toLocaleString("en-IN")}
- Top expenses: ${monthExpenses.slice(0, 3).map(e => `₹${e.amount} for ${e.purpose} (${e.category})`).join(", ") || "None"}

IDEAS VAULT:
- Total ideas: ${ideas.length}
- Recent ideas: ${ideas.slice(0, 3).map(i => `"${i.title}" [${i.category}]`).join(", ") || "None"}

Be concise, actionable, and direct. Use bullet points. No fluff. Focus on what matters for an early-stage startup.
  `.trim();
}

export default function AIPage() {
  const { tasks } = useTaskStore();
  const { goals } = useGoalStore();
  const { expenses } = useExpenseStore();
  const { ideas } = useIdeaStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const context = buildContext(tasks, goals, expenses, ideas);
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      // Mock response when no API key is configured
      const mockResponses: Record<string, string> = {
        default: `**Autobee AI Assistant**\n\nTo enable real AI responses, add your Gemini API key to \`.env.local\`:\n\`\`\`\nNEXT_PUBLIC_GEMINI_API_KEY=your_key_here\`\`\`\n\nGet a free key at [aistudio.google.com](https://aistudio.google.com)\n\nIn the meantime, I can see you have:\n- **${tasks.filter(t => t.status !== "done").length}** open tasks\n- **${goals.filter(g => g.status === "active").length}** active goals\n- **${ideas.length}** ideas captured`,
      };
      await new Promise(r => setTimeout(r, 800));
      setMessages(prev => [...prev, {
        role: "assistant",
        content: mockResponses.default,
        timestamp: new Date(),
      }]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: context + "\n\n---\n\nUser: " + text }] }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to generate response");
      }
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't generate a response.";
      setMessages(prev => [...prev, { role: "assistant", content: reply, timestamp: new Date() }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Failed to connect to AI: ${e.message}\n\nPlease check your API key in \`.env.local\`.`,
        timestamp: new Date(),
      }]);
    }
    setLoading(false);
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px-64px)] md:h-[calc(100vh-56px)] max-w-3xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between py-5 border-b border-white/05">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden bg-white/5 border border-white/10">
            <img src="/logo.png" alt="Autobee Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-sm">AI Assistant</h1>
            <p className="text-[10px] text-muted-foreground">Powered by Google Gemini</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="py-6 flex-1 overflow-y-auto">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bee-gradient flex items-center justify-center mx-auto mb-3 bee-glow-sm float">
              <Bot className="w-7 h-7 text-[#111]" />
            </div>
            <h2 className="font-bold mb-1">Ask anything about Autobee</h2>
            <p className="text-sm text-muted-foreground">I have context about your tasks, goals, expenses, and ideas.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <motion.button
                key={prompt}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => sendMessage(prompt)}
                className="text-left px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-all card-hover"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden bg-white/5 border border-white/10">
                    <img src="/logo.png" alt="AI Avatar" className="w-full h-full object-contain" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-[rgba(255,193,7,0.15)] text-foreground rounded-tr-sm"
                      : "bg-[var(--card)] border border-[var(--border)] rounded-tl-sm"
                  )}
                >
                  {/* Basic markdown-like rendering */}
                  {msg.content.split("\n").map((line, li) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={li} className="font-bold mb-1">{line.slice(2, -2)}</p>;
                    }
                    if (line.startsWith("- ")) {
                      return <p key={li} className="flex items-start gap-1.5 text-muted-foreground"><span className="text-[#FFC107] mt-0.5">•</span>{line.slice(2)}</p>;
                    }
                    if (line === "") return <br key={li} />;
                    return <p key={li} className={line.startsWith("##") ? "font-semibold mt-2 mb-1" : ""}>{line.replace(/\*\*/g, "")}</p>;
                  })}
                  <p className="text-[10px] text-muted-foreground mt-2 text-right">
                    {format(msg.timestamp, "HH:mm")}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-xl bee-gradient flex items-center justify-center">
                <Loader2 className="w-3.5 h-3.5 text-[#111] animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="py-4 border-t border-white/05">
        <div
          className="flex items-end gap-2 rounded-2xl p-2"
          style={{ background: "var(--card)", border: "1px solid rgba(255,193,7,0.2)" }}
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about your startup..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none px-2 py-1.5 max-h-32"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl bee-gradient flex items-center justify-center text-[#111] disabled:opacity-40 flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </motion.button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
