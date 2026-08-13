"use client";
// src/components/Providers.tsx
import { useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useIdeaStore } from "@/store/useIdeaStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useMeetingStore } from "@/store/useMeetingStore";
import { useIncomeStore } from "@/store/useIncomeStore";
import { usePartnerStore } from "@/store/usePartnerStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useRoadmapStore } from "@/store/useRoadmapStore";
import { useWorkdayStore } from "@/store/useWorkdayStore";
import { useSettlementStore } from "@/store/useSettlementStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationToast } from "@/components/notifications/NotificationToast";

export function Providers({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  // Load current user from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("autobee_current_user");
      if (storedUser && ["Sourabh", "Asher", "Subin"].includes(storedUser)) {
        useUIStore.getState().setCurrentUser(storedUser as any);
      }
    }
  }, []);

  // Subscribe to all Supabase real-time channels on mount
  useEffect(() => {
    const unsubs = [
      useTaskStore.getState().subscribeToTasks(),
      useGoalStore.getState().subscribeToGoals(),
      useIdeaStore.getState().subscribeToIdeas(),
      useExpenseStore.getState().subscribeToExpenses(),
      useMeetingStore.getState().subscribeToMeetings(),
      useIncomeStore.getState().subscribeToIncome(),
      usePartnerStore.getState().subscribeToPartners(),
      useDocumentStore.getState().subscribeToDocuments(),
      useRoadmapStore.getState().subscribeToRoadmapChanges(),
      useWorkdayStore.getState().initRealtime(),
      useSettlementStore.getState().initRealtime(),
      useNotificationStore.getState().initRealtime(),
    ];

    return () => {
      unsubs.forEach(fn => fn());
    };
  }, []);


  return (
    <TooltipProvider>
      {children}
      <NotificationToast />
    </TooltipProvider>
  );
}

