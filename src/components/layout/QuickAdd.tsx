"use client";
// src/components/layout/QuickAdd.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, CheckSquare, DollarSign, Lightbulb } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { createTask } from "@/lib/supabase/tasks";
import { createExpense } from "@/lib/supabase/expenses";
import { createIdea } from "@/lib/supabase/ideas";
import { Person, Priority, ExpenseCategory, IdeaCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuickAdd() {
  const { quickAddOpen, quickAddTab, setQuickAddOpen } = useUIStore();
  const [loading, setLoading] = useState(false);

  const defaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  };

  // Task state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<Person>("Sourabh");
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");
  const [taskDeadline, setTaskDeadline] = useState(defaultDeadline());
  const [taskTags, setTaskTags] = useState("");

  // Expense state
  const [expAmount, setExpAmount] = useState("");
  const [expPurpose, setExpPurpose] = useState("");
  const [expPerson, setExpPerson] = useState<Person>("Sourabh");
  const [expCat, setExpCat] = useState<ExpenseCategory>("misc");

  // Idea state
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaCat, setIdeaCat] = useState<IdeaCategory>("feature");

  const close = () => setQuickAddOpen(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (quickAddTab === "task" && taskTitle.trim()) {
        if (!taskDeadline) {
          alert("Deadline is required");
          setLoading(false);
          return;
        }
        const tagsArr = taskTags.trim() ? taskTags.split(",").map(t => t.trim()).filter(Boolean) : [];
        await createTask({
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          assignee: taskAssignee,
          priority: taskPriority,
          status: "todo",
          deadline: taskDeadline,
          tags: tagsArr,
          pinned: false,
          archived: false,
          subtasks: [],
          comments: [],
          repeat: "none",
        });
        setTaskTitle("");
        setTaskDescription("");
        setTaskTags("");
        setTaskDeadline(defaultDeadline());
        close();
      } else if (quickAddTab === "expense" && expAmount && expPurpose) {
        await createExpense({
          amount: parseFloat(expAmount),
          purpose: expPurpose,
          category: expCat,
          person: expPerson,
          date: new Date().toISOString().split("T")[0],
          paymentMethod: "upi",
          recurring: false,
        });
        setExpAmount(""); setExpPurpose(""); close();
      } else if (quickAddTab === "idea" && ideaTitle.trim()) {
        await createIdea({
          title: ideaTitle.trim(),
          category: ideaCat,
          priority: "medium",
          tags: [],
          pinned: false,
        });
        setIdeaTitle(""); close();
      }
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: "task" as const, label: "Task", icon: CheckSquare },
    { id: "expense" as const, label: "Expense", icon: DollarSign },
    { id: "idea" as const, label: "Idea", icon: Lightbulb },
  ];

  const PERSONS: Person[] = ["Sourabh", "Asher", "Subin", "All"];
  const PRIORITIES: { value: Priority; label: string; color: string }[] = [
    { value: "urgent", label: "🔴 Urgent", color: "#ef4444" },
    { value: "high",   label: "🟠 High",   color: "#f97316" },
    { value: "medium", label: "🟡 Medium", color: "#FFC107" },
    { value: "low",    label: "⚪ Low",    color: "#6b7280" },
  ];

  return (
    <AnimatePresence>
      {quickAddOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={close}
          />
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="w-full sm:max-w-md pointer-events-auto rounded-t-2xl sm:rounded-2xl overflow-hidden"
              style={{
                background: "rgba(18,18,18,0.98)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5">
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => useUIStore.setState({ quickAddTab: id })}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        quickAddTab === id
                          ? "bg-[#FFC107] text-[#111]"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={close} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 pb-5 space-y-3">
                {/* TASK FORM */}
                {quickAddTab === "task" && (
                  <>
                    <input
                      autoFocus
                      value={taskTitle}
                      onChange={e => setTaskTitle(e.target.value)}
                      placeholder="Title*"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
                      required
                    />
                    <textarea
                      value={taskDescription}
                      onChange={e => setTaskDescription(e.target.value)}
                      placeholder="Description"
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block font-medium uppercase tracking-wider">Assignee</label>
                        <select
                          value={taskAssignee}
                          onChange={e => setTaskAssignee(e.target.value as Person)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground outline-none"
                        >
                          {PERSONS.filter(p => p !== "All").map(p => <option key={p} value={p} className="bg-[#161616] text-[#f5f5f5]">{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block font-medium uppercase tracking-wider">Priority</label>
                        <select
                          value={taskPriority}
                          onChange={e => setTaskPriority(e.target.value as Priority)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground outline-none"
                        >
                          {PRIORITIES.map(p => <option key={p.value} value={p.value} className="bg-[#161616] text-[#f5f5f5]">{p.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block font-medium uppercase tracking-wider">Deadline*</label>
                        <input
                          type="date"
                          value={taskDeadline}
                          onChange={e => setTaskDeadline(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground outline-none focus:border-[rgba(255,193,7,0.4)]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block font-medium uppercase tracking-wider">Tags (comma sep)</label>
                        <input
                          type="text"
                          value={taskTags}
                          onChange={e => setTaskTags(e.target.value)}
                          placeholder="e.g. design, core"
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[rgba(255,193,7,0.4)]"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* EXPENSE FORM */}
                {quickAddTab === "expense" && (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                        <input
                          autoFocus
                          type="number"
                          value={expAmount}
                          onChange={e => setExpAmount(e.target.value)}
                          placeholder="Amount"
                          className="w-full pl-7 pr-3 py-3 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
                        />
                      </div>
                      <select
                        value={expPerson}
                        onChange={e => setExpPerson(e.target.value as Person)}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground outline-none"
                      >
                        {PERSONS.map(p => <option key={p} value={p} className="bg-[#161616] text-[#f5f5f5]">{p}</option>)}
                      </select>
                    </div>
                    <input
                      value={expPurpose}
                      onChange={e => setExpPurpose(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSubmit()}
                      placeholder="Purpose (e.g. Google Ads)"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
                    />
                    <select
                      value={expCat}
                      onChange={e => setExpCat(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground outline-none capitalize"
                    >
                      {["fuel","travel","marketing","food","meetings","software","subscriptions","development","equipment","operations","misc"].map(c =>
                        <option key={c} value={c} className="bg-[#161616] text-[#f5f5f5] capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      )}
                    </select>
                  </>
                )}

                {/* IDEA FORM */}
                {quickAddTab === "idea" && (
                  <>
                    <input
                      autoFocus
                      value={ideaTitle}
                      onChange={e => setIdeaTitle(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSubmit()}
                      placeholder="Idea title..."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[rgba(255,193,7,0.4)] transition-colors"
                    />
                    <select
                      value={ideaCat}
                      onChange={e => setIdeaCat(e.target.value as IdeaCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/08 text-sm text-foreground outline-none"
                    >
                      {["startup","feature","research","problem","request"].map(c =>
                        <option key={c} value={c} className="bg-[#161616] text-[#f5f5f5] capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      )}
                    </select>
                  </>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bee-gradient text-[#111] font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
                  ) : (
                    <><Plus className="w-4 h-4" strokeWidth={2.5} /> Add {quickAddTab.charAt(0).toUpperCase() + quickAddTab.slice(1)}</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
