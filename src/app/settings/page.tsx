"use client";
// src/app/settings/page.tsx — Settings
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Moon, Sun, Download, Trash2, Keyboard, Smartphone,
  Info, ChevronRight, Shield, Bell, User
} from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { NotificationToggle } from "@/components/NotificationToggle";
import { useTaskStore } from "@/store/useTaskStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useIdeaStore } from "@/store/useIdeaStore";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  { key: "Ctrl + K", label: "Open command palette" },
  { key: "Ctrl + N", label: "New task (via quick add)" },
  { key: "Ctrl + E", label: "New expense (via quick add)" },
  { key: "Esc",      label: "Close modal / palette" },
  { key: "Enter",    label: "Submit form" },
];

export default function SettingsPage() {
  const { theme, setTheme, currentUser, setCurrentUser } = useUIStore();
  const { tasks } = useTaskStore();
  const { goals } = useGoalStore();
  const { expenses } = useExpenseStore();
  const { ideas } = useIdeaStore();
  const [exported, setExported] = useState(false);

  const exportData = () => {
    const data = { tasks, goals, expenses, ideas, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `autobee-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h2>
      <div className="rounded-2xl overflow-hidden bg-[var(--card)] border border-[var(--border)] divide-y divide-white/05">
        {children}
      </div>
    </div>
  );

  const Row = ({
    icon: Icon, label, desc, action, right, danger
  }: {
    icon: React.ElementType; label: string; desc?: string;
    action?: () => void; right?: React.ReactNode; danger?: boolean;
  }) => (
    <button
      onClick={action}
      disabled={!action}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 transition-colors text-left",
        action ? "hover:bg-white/03 cursor-pointer" : "cursor-default",
        danger && "hover:bg-red-500/05"
      )}
    >
      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon className={cn("w-4 h-4", danger ? "text-red-400" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", danger && "text-red-400")}>{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {right ?? (action && !danger && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />)}
    </button>
  );

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Autobee OS · Internal workspace</p>
      </motion.div>

      {/* App info banner */}
      <div
        className="rounded-2xl p-4 flex items-center gap-4"
        style={{ background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.15)" }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white/5 border border-white/10">
          <img src="/logo.png" alt="Autobee Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="font-bold text-sm">Autobee OS</p>
          <p className="text-xs text-muted-foreground">Internal startup workspace · v1.0.0</p>
        </div>
      </div>

      <Section title="Appearance">
        <Row
          icon={theme === "dark" ? Moon : Sun}
          label="Theme"
          desc={theme === "dark" ? "Dark mode" : "Light mode"}
          action={() => setTheme(theme === "dark" ? "light" : "dark")}
          right={
            <div
              className={cn(
                "w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0",
                theme === "light" ? "bg-[#FFC107]" : "bg-white/10"
              )}
              style={{ height: "22px" }}
            >
              <div
                className="absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform"
                style={{
                  width: "18px", height: "18px",
                  transform: theme === "light" ? "translateX(22px)" : "translateX(2px)"
                }}
              />
            </div>
          }
        />
      </Section>

      <Section title="Workspace Identity">
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">Select who is using this device to route notifications and log tasks correctly.</p>
          <div className="grid grid-cols-3 gap-2">
            {(["Sourabh", "Asher", "Subin"] as const).map((user) => {
              const active = currentUser === user;
              return (
                <button
                  key={user}
                  onClick={() => setCurrentUser(user)}
                  className={cn(
                    "py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                    active
                      ? "bg-[#FFC107] border-[#FFC107] text-[#111] shadow-[0_0_12px_rgba(255,193,7,0.15)]"
                      : "bg-white/03 border-white/05 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  {user}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Notifications">
        <Row
          icon={Bell}
          label="Push Notifications"
          desc="Task reminders & meeting alerts"
          right={<NotificationToggle />}
        />
        <div className="px-5 py-3.5 bg-white/[0.01] text-[11px] text-muted-foreground border-t border-white/05 flex flex-col gap-1">
          <p>⚠️ iOS: To receive notifications, you must first add this app to your Home Screen.</p>
          <p>🔒 Testing: Notifications require a secure (HTTPS) context.</p>
        </div>
      </Section>

      <Section title="Data">
        <Row
          icon={Download}
          label="Export Backup"
          desc={`${tasks.length} tasks · ${expenses.length} expenses · ${goals.length} goals · ${ideas.length} ideas`}
          action={exportData}
          right={
            exported ? (
              <span className="text-xs text-green-400 font-medium">Downloaded!</span>
            ) : undefined
          }
        />
        <Row
          icon={Shield}
          label="Data Storage"
          desc="Firebase Firestore · sourabhzssc project"
        />
      </Section>

      <Section title="Keyboard Shortcuts">
        {SHORTCUTS.map(({ key, label }) => (
          <Row
            key={key}
            icon={Keyboard}
            label={label}
            right={
              <kbd className="text-[11px] px-2 py-1 rounded-lg bg-white/08 font-mono text-muted-foreground">{key}</kbd>
            }
          />
        ))}
      </Section>

      <Section title="PWA / Mobile">
        <Row
          icon={Smartphone}
          label="Install as App"
          desc="Add Autobee OS to your home screen for the best experience"
          action={() => {
            const event = (window as unknown as { deferredPrompt?: { prompt: () => void } }).deferredPrompt;
            if (event) {
              event.prompt();
            } else {
              alert("Use your browser's 'Add to Home Screen' option to install the app.");
            }
          }}
        />
      </Section>

      <Section title="About">
        <Row
          icon={Info}
          label="Built for Autobee"
          desc="autobee.care · 3-person startup team"
        />
      </Section>
    </div>
  );
}
