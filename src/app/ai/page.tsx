"use client";
// src/app/ai/page.tsx — AI Assistant (Gemini-powered with Streaming)
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, Loader2, RefreshCw } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, Goal, Expense } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "What should I focus on today?",
  "Summarize this week's expenses",
  "Which goals are at risk?",
  "Draft a meeting agenda"
];

function buildContext(tasks: Task[], goals: Goal[], expenses: Expense[]) {
  const now = new Date();
  const openTasks = tasks.filter(t => t.status !== "done");
  const urgentTasks = tasks.filter(t => t.priority === "urgent" && t.status !== "done");
  const activeGoals = goals.filter(g => g.status === "active");
  const monthExpenses = expenses.filter(e =>
    isWithinInterval(parseISO(e.date), { start: startOfMonth(now), end: endOfMonth(now) })
  );
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  return `
You are a brilliant, concise business and productivity assistant for Autobee, a 3-person startup team consisting of:
- Sourabh (color: #FFC107, initial: S)
- Asher (color: #3B82F6, initial: A)
- Subin (color: #10B981, initial: Su)

Current date: ${format(now, "d MMMM yyyy")}

CURRENT WORKSPACE CONTEXT:
- Total Open Tasks: ${openTasks.length}
- Urgent Tasks: ${urgentTasks.map(t => `"${t.title}" (assigned to: ${t.assignee})`).join(", ") || "None"}
- Open Tasks List: ${openTasks.slice(0, 10).map(t => `"${t.title}" [Priority: ${t.priority}, Assigned: ${t.assignee}]`).join(", ")}
- Active Goals: ${activeGoals.map(g => `"${g.title}" at ${g.progress}% progress`).join(", ") || "None"}
- Expenses Spent This Month: ₹${monthTotal.toLocaleString("en-IN")}
- Recent Expenses (last 10): ${expenses.slice(0, 10).map(e => `₹${e.amount} for "${e.purpose}" (${e.category}) paid by ${e.person} on ${e.date}`).join(", ")}

RESPONSE INSTRUCTIONS:
- Be brutally concise, action-oriented, and direct.
- Limit responses to 2-3 short paragraphs or bullet points.
- Do not use introductory fluff or conversational filler.
- Focus on startup momentum and bottlenecks.
- Refer to Sourabh, Asher, or Subin directly.
`.trim();
}

export default function AIPage() {
  const { tasks } = useTaskStore();
  const { goals } = useGoalStore();
  const { expenses } = useExpenseStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Restore chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("autobee_ai_history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save chat history to localStorage on change
  const updateMessages = (newMsgs: Message[]) => {
    setMessages(newMsgs);
    localStorage.setItem("autobee_ai_history", JSON.stringify(newMsgs));
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };
    
    const nextMsgs = [...messages, userMsg];
    updateMessages(nextMsgs);
    setInput("");
    setLoading(true);

    const contextPrompt = buildContext(tasks, goals, expenses);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMsgs,
          context: contextPrompt
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Initialize assistant stream message
      const assistantMsg: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString()
      };
      
      const currentMsgs = [...nextMsgs, assistantMsg];
      updateMessages(currentMsgs);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream reader available");

      let accumulatedText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value);
        accumulatedText += textChunk;

        // Update last message contents dynamically
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: accumulatedText
            };
          }
          return updated;
        });
      }

      // Save complete conversation history
      const finalMsgs: Message[] = [...nextMsgs, {
        role: "assistant",
        content: accumulatedText,
        timestamp: new Date().toISOString()
      }];
      updateMessages(finalMsgs);

    } catch (e: any) {
      console.error(e);
      const errorMsgs: Message[] = [...nextMsgs, {
        role: "assistant",
        content: `⚠️ Failed to fetch response: ${e.message || "Unknown error"}. Please check your Gemini API Key.`,
        timestamp: new Date().toISOString()
      }];
      updateMessages(errorMsgs);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem("autobee_ai_history");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px-64px)] md:h-[calc(100vh-56px)] max-w-3xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between py-5 border-b border-white/05">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden bg-white/5 border border-white/10">
            <img src="/logo.png" alt="Autobee Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground/90">AI Co-pilot</h1>
            <p className="text-[10px] text-muted-foreground">Powered by Gemini</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Clear Chat
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
            <h2 className="font-bold mb-1 text-foreground/95">Startup Operations Assistant</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Ask me anything about Autobee. I have live context on tasks, active goals, and recent team expenses.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
            {QUICK_PROMPTS.map(prompt => (
              <motion.button
                key={prompt}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => sendMessage(prompt)}
                className="text-left px-4 py-3.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-all glass-card"
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
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
                    "max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed",
                    msg.role === "user"
                      ? "bg-[rgba(255,193,7,0.15)] text-foreground/95 rounded-tr-sm"
                      : "bg-[var(--card)] border border-[var(--border)] rounded-tl-sm glass-card"
                  )}
                >
                  {/* Markdown text formatter */}
                  <div className="space-y-1.5 whitespace-pre-wrap">
                    {msg.content.split("\n").map((line, li) => {
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <p key={li} className="font-bold text-foreground">{line.slice(2, -2)}</p>;
                      }
                      if (line.startsWith("- ")) {
                        return <p key={li} className="flex items-start gap-1.5 text-muted-foreground"><span className="text-[#FFC107] mt-0.5">•</span>{line.slice(2)}</p>;
                      }
                      if (line === "") return <div key={li} className="h-1" />;
                      return <p key={li} className={line.startsWith("##") ? "font-bold text-foreground mt-2 text-sm" : "text-foreground/90"}>{line.replace(/\*\*/g, "")}</p>;
                    })}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2 text-right">
                    {format(parseISO(msg.timestamp), "HH:mm")}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-xl bee-gradient flex items-center justify-center">
                <Loader2 className="w-3.5 h-3.5 text-[#111] animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[var(--card)] border border-[var(--border)] glass-card">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#FFC107] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input controls */}
      <div className="py-4 border-t border-white/05 bg-background">
        <div
          className="flex items-end gap-2 rounded-2xl p-2 glass-card-strong"
          style={{ border: "1px solid rgba(255,193,7,0.2)" }}
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
            placeholder="Ask AI co-pilot about projects or money..."
            rows={1}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none px-2 py-1.5 max-h-32"
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
        <p className="text-[9px] text-muted-foreground text-center mt-2 font-medium">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
