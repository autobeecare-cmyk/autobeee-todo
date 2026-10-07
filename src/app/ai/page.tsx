"use client";
// src/app/ai/page.tsx — AutoBee Intelligence (Gemini-Powered with Resilient Streaming & Error Handling)
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Check,
  Copy,
  Terminal,
} from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { usePartnerStore } from "@/store/usePartnerStore";
import { useMeetingStore } from "@/store/useMeetingStore";
import { useUIStore } from "@/store/useUIStore";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, Goal, Expense, Partner, Meeting } from "@/lib/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isError?: boolean;
  errorType?: string;
  retryPrompt?: string;
}

const QUICK_PROMPTS = [
  "What should I focus on today?",
  "Analyze our open goals and progress",
  "Summarize this month's company expenses",
  "Which partners require follow-up?",
];

function buildWorkspaceContext(
  tasks: Task[],
  goals: Goal[],
  expenses: Expense[],
  partners: Partner[],
  meetings: Meeting[],
  currentUser: string
) {
  const now = new Date();
  const openTasks = tasks.filter((t) => t.status !== "done");
  const urgentTasks = openTasks.filter((t) => t.priority === "urgent" || t.priority === "high");
  const activeGoals = goals.filter((g) => g.status === "active");

  const monthExpenses = expenses.filter((e) => {
    try {
      return isWithinInterval(parseISO(e.date), {
        start: startOfMonth(now),
        end: endOfMonth(now),
      });
    } catch {
      return false;
    }
  });
  const monthTotal = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const followUpPartners = partners.filter((p) => p.pipeline_status === "Follow-Up");
  const upcomingMeetings = meetings.filter((m) => m.status === "upcoming");

  return `
You are AutoBee Intelligence — the Chief Operating Officer and AI Partner for the AutoBee startup team.
Co-Founders:
- Sourabh (Current viewer: ${currentUser === "Sourabh" ? "YES" : "NO"})
- Asher (Current viewer: ${currentUser === "Asher" ? "YES" : "NO"})

Current Date: ${format(now, "d MMMM yyyy, EEEE")}

LIVE WORKSPACE CONTEXT:
- Active Founder Logged In: ${currentUser}
- Total Open Tasks: ${openTasks.length}
- High & Urgent Priority Tasks: ${
    urgentTasks.length > 0
      ? urgentTasks.map((t) => `"${t.title}" (${t.priority}, assignee: ${t.assignee})`).join("; ")
      : "None"
  }
- Active Goals: ${
    activeGoals.length > 0
      ? activeGoals.map((g) => `"${g.title}" at ${g.progress}% progress`).join("; ")
      : "None active"
  }
- Company Spending This Month: ₹${monthTotal.toLocaleString("en-IN")} (${monthExpenses.length} transactions)
- Partner CRM Follow-Ups Due: ${followUpPartners.length} partners (${
    followUpPartners.slice(0, 5).map((p) => p.name).join(", ") || "None"
  })
- Upcoming Meetings: ${upcomingMeetings.length} meetings scheduled

EXECUTIVE INSTRUCTIONS:
- Be direct, data-focused, concise, and startup execution-oriented.
- Use clear markdown: bold highlights, bullet points, headers for sections.
- When answering questions about priorities or bottlenecks, cite actual workspace figures above.
- Never use robotic platitudes or conversational filler.
- If asked for action plans, break into practical numbered steps.
`.trim();
}

/**
 * Message Formatter Component with Markdown, Copy Code blocks, and clean styling.
 */
function FormattedMessage({ content }: { content: string }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs sm:text-[13px] leading-relaxed">
      {parts.map((part, pIdx) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : "";
          const codeText = language ? lines.slice(1).join("\n") : lines.join("\n");

          return (
            <div
              key={pIdx}
              className="my-2 rounded-xl overflow-hidden bg-black/60 border border-white/10 font-mono text-[11px]"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-b border-white/05 text-muted-foreground text-[10px]">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-[#FFC107]" />
                  <span>{language || "snippet"}</span>
                </div>
                <button
                  onClick={() => handleCopyCode(codeText, pIdx)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors p-1 rounded"
                >
                  {copiedIdx === pIdx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-emerald-300 whitespace-pre">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        }

        // Regular text formatting
        return (
          <div key={pIdx} className="space-y-1.5 whitespace-pre-wrap">
            {part.split("\n").map((line, li) => {
              if (line.startsWith("### ")) {
                return (
                  <h4 key={li} className="font-bold text-foreground text-xs sm:text-sm mt-2 text-[#FFC107]">
                    {line.slice(4)}
                  </h4>
                );
              }
              if (line.startsWith("## ")) {
                return (
                  <h3 key={li} className="font-bold text-foreground text-sm sm:text-base mt-2.5">
                    {line.slice(3)}
                  </h3>
                );
              }
              if (line.startsWith("# ")) {
                return (
                  <h2 key={li} className="font-black text-foreground text-base mt-3">
                    {line.slice(2)}
                  </h2>
                );
              }
              if (line.startsWith("- ") || line.startsWith("* ")) {
                return (
                  <div key={li} className="flex items-start gap-2 text-foreground/90 pl-1">
                    <span className="text-[#FFC107] font-bold mt-0.5">•</span>
                    <span>{renderInlineStyles(line.slice(2))}</span>
                  </div>
                );
              }
              if (/^\d+\.\s/.test(line)) {
                const num = line.match(/^(\d+)\.\s/)?.[1] || "1";
                const rest = line.replace(/^\d+\.\s/, "");
                return (
                  <div key={li} className="flex items-start gap-2 text-foreground/90 pl-1">
                    <span className="text-[#FFC107] font-mono text-[11px] font-bold mt-0.5">{num}.</span>
                    <span>{renderInlineStyles(rest)}</span>
                  </div>
                );
              }
              if (line.trim() === "") {
                return <div key={li} className="h-1" />;
              }

              return <p key={li} className="text-foreground/90">{renderInlineStyles(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInlineStyles(text: string) {
  // Bold formatting **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Inline code `code`
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-white/10 text-[#FFC107] font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function AIPageInner() {
  const { tasks } = useTaskStore();
  const { goals } = useGoalStore();
  const { expenses } = useExpenseStore();
  const { partners } = usePartnerStore();
  const { meetings } = useMeetingStore();
  const currentUser = useUIStore((s) => s.currentUser);
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q");
  const hasAutoSent = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("gemini-2.5-flash");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore chat from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("autobee_ai_history_v2");
      if (saved) {
        setMessages(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to read chat history:", e);
    }
  }, []);

  const updateMessages = useCallback((newMsgs: Message[]) => {
    setMessages(newMsgs);
    try {
      localStorage.setItem("autobee_ai_history_v2", JSON.stringify(newMsgs));
    } catch (e) {
      console.warn("Failed to save chat history:", e);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMsgs = [...messages, userMsg];
    updateMessages(nextMsgs);
    setInput("");
    setLoading(true);

    const contextPrompt = buildWorkspaceContext(
      tasks,
      goals,
      expenses,
      partners,
      meetings,
      currentUser
    );

    const assistantMsgId = "asst-" + Date.now();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    const withEmptyAssistant = [...nextMsgs, assistantMsg];
    updateMessages(withEmptyAssistant);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
          context: contextPrompt,
        }),
      });

      const modelHeader = response.headers.get("X-AI-Model");
      if (modelHeader) setActiveModel(modelHeader);

      if (!response.ok) {
        let errMessage = "AI request failed. Please try again.";
        let errType = "unknown";
        try {
          const errJson = await response.json();
          if (errJson?.error) {
            errMessage = errJson.error.message || errMessage;
            errType = errJson.error.type || errType;
          }
        } catch {
          const raw = await response.text();
          if (raw) errMessage = raw;
        }

        const errorMsgs = withEmptyAssistant.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: errMessage,
                isError: true,
                errorType: errType,
                retryPrompt: trimmed,
              }
            : m
        );
        updateMessages(errorMsgs);
        setLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream available");

      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        accumulated += textChunk;

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulated } : m))
        );
      }

      // Final save to localStorage
      const finalMsgs = withEmptyAssistant.map((m) =>
        m.id === assistantMsgId ? { ...m, content: accumulated } : m
      );
      updateMessages(finalMsgs);
    } catch (err: any) {
      console.error("[AI Chat Client Error]:", err);
      const isNetwork = err?.message?.includes("fetch") || err?.name === "TypeError";
      const errorMsgs = withEmptyAssistant.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              content: isNetwork
                ? "Network connection interrupted. Please check your internet connection and try again."
                : (err?.message || "An unexpected error occurred while communicating with AutoBee Intelligence."),
              isError: true,
              errorType: isNetwork ? "network" : "client",
              retryPrompt: trimmed,
            }
          : m
      );
      updateMessages(errorMsgs);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = (promptText?: string) => {
    if (!promptText) return;
    sendMessage(promptText);
  };

  // Auto-send query from dashboard deep link
  useEffect(() => {
    if (qParam && !hasAutoSent.current) {
      hasAutoSent.current = true;
      sendMessage(qParam);
    }
  }, [qParam]);

  const clearChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem("autobee_ai_history_v2");
    } catch {}
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-70px)] md:h-[calc(100dvh-56px)] max-w-[1240px] w-full mx-auto px-3.5 sm:px-6 lg:px-8">
      {/* Header bar */}
      <div className="flex items-center justify-between py-3 sm:py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden bg-white/5 border border-white/10 shrink-0 shadow-sm">
            <img src="/logo.png" alt="AutoBee Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base text-foreground leading-tight">
                AutoBee Intelligence
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFC107]/10 text-[#FFC107] border border-[#FFC107]/20">
                <Sparkles className="w-2.5 h-2.5" />
                <span>{activeModel}</span>
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Startup Operations Copilot · Live context with Tasks, CRM & Finances
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl hover:bg-white/5 border border-white/05 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        )}
      </div>

      {/* Empty State / Quick Prompts */}
      {messages.length === 0 && (
        <div className="py-8 flex-1 overflow-y-auto flex flex-col justify-center items-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 max-w-md mx-auto"
          >
            <div className="w-14 h-14 rounded-2xl bee-gradient flex items-center justify-center mx-auto mb-3.5 shadow-[0_0_25px_rgba(255,193,7,0.25)]">
              <Bot className="w-7 h-7 text-[#111]" />
            </div>
            <h2 className="font-black text-lg sm:text-xl mb-1.5 text-foreground tracking-tight">
              AutoBee Executive Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Ask questions about company execution, bottlenecks, open goals, partner CRM follow-ups, or team financials.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto w-full px-2">
            {QUICK_PROMPTS.map((prompt) => (
              <motion.button
                key={prompt}
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => sendMessage(prompt)}
                className="text-left px-4 py-3.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-all bg-[#141414]/90 border border-white/[0.08] hover:border-[#FFC107]/30 hover:bg-[#181818] cursor-pointer shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <span>{prompt}</span>
                  <span className="text-[#FFC107] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Messages stream area */}
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden bg-white/5 border border-white/10 shadow-sm">
                    <img src="/logo.png" alt="AI Avatar" className="w-full h-full object-contain" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[88%] sm:max-w-[80%] px-4 py-3 rounded-2xl leading-relaxed shadow-sm",
                    msg.role === "user"
                      ? "bg-[rgba(255,193,7,0.14)] text-foreground/95 rounded-tr-sm border border-[#FFC107]/25"
                      : msg.isError
                      ? "bg-red-500/[0.08] border border-red-500/25 rounded-tl-sm text-red-200"
                      : "bg-[#151515] border border-white/[0.08] rounded-tl-sm text-foreground/90 backdrop-blur-md"
                  )}
                >
                  {msg.isError ? (
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2 text-xs sm:text-sm font-semibold text-red-400">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{msg.content}</span>
                      </div>
                      {msg.retryPrompt && (
                        <div className="pt-1">
                          <button
                            onClick={() => handleRetry(msg.retryPrompt)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-all cursor-pointer border border-red-500/30"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry Request</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : msg.content ? (
                    <FormattedMessage content={msg.content} />
                  ) : (
                    /* Initial thinking indicator before first token */
                    <div className="flex items-center gap-2 py-1 text-muted-foreground text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFC107] animate-spin" />
                      <span>AutoBee Intelligence is formulating a response...</span>
                    </div>
                  )}

                  <p className="text-[9px] text-muted-foreground/60 mt-2 text-right">
                    {format(parseISO(msg.timestamp), "HH:mm")}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking animation if user just submitted and assistant hasn't started */}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-xl bee-gradient flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 text-[#111] animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[#151515] border border-white/[0.08] glass-card flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Thinking</span>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#FFC107] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input Composer */}
      <div className="py-3 sm:py-4 border-t border-white/[0.06] bg-background shrink-0">
        <div
          className="flex items-end gap-2 rounded-2xl p-2 sm:p-2.5 bg-[#141414] border border-[#FFC107]/25 shadow-lg focus-within:border-[#FFC107]/60 transition-colors"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask AutoBee Intelligence about tasks, goals, CRM, or cash..."
            rows={1}
            className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none resize-none px-2 py-1 max-h-32 leading-relaxed"
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bee-gradient flex items-center justify-center text-[#111] disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer shadow-sm hover:scale-[1.02] transition-transform"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#111] animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </motion.button>
        </div>
        <div className="flex items-center justify-between px-2 mt-2 text-[10px] text-muted-foreground">
          <span>Enter to send · Shift+Enter for new line</span>
          <span className="hidden sm:inline">Context: Live Workspace Sync</span>
        </div>
      </div>
    </div>
  );
}


export default function AIPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading AutoBee Intelligence...</div>}>
      <AIPageInner />
    </Suspense>
  );
}
