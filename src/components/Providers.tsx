"use client";
// src/components/Providers.tsx
import { useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useIdeaStore } from "@/store/useIdeaStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { subscribeTasks } from "@/lib/firestore/tasks";
import { subscribeGoals } from "@/lib/firestore/goals";
import { subscribeIdeas } from "@/lib/firestore/ideas";
import { subscribeExpenses } from "@/lib/firestore/expenses";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();
  const { setTasks } = useTaskStore();
  const { setGoals } = useGoalStore();
  const { setIdeas } = useIdeaStore();
  const { setExpenses } = useExpenseStore();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  // Subscribe to all Firestore collections on mount
  useEffect(() => {
    const unsubTasks = subscribeTasks(setTasks);
    const unsubGoals = subscribeGoals(setGoals);
    const unsubIdeas = subscribeIdeas(setIdeas);
    const unsubExpenses = subscribeExpenses(setExpenses);
    return () => {
      unsubTasks();
      unsubGoals();
      unsubIdeas();
      unsubExpenses();
    };
  }, [setTasks, setGoals, setIdeas, setExpenses]);

  return (
    <TooltipProvider>
      {children}
    </TooltipProvider>
  );
}
