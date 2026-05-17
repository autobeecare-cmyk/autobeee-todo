// src/lib/types.ts
export type Person = "Sourabh" | "Asher" | "Subin" | "All";
export type Priority = "urgent" | "high" | "medium" | "low";
export type TaskStatus = "todo" | "doing" | "done";
export type GoalCategory = "startup" | "growth" | "learning" | "product" | "finance";
export type IdeaCategory = "startup" | "feature" | "research" | "problem" | "request";
export type ExpenseCategory =
  | "fuel" | "travel" | "marketing" | "food" | "meetings"
  | "software" | "subscriptions" | "development" | "equipment"
  | "operations" | "misc";
export type PaymentMethod = "cash" | "upi" | "card" | "bank";
export type RepeatInterval = "none" | "daily" | "weekly" | "monthly";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskComment {
  id: string;
  text: string;
  createdAt: string;
  author?: Person;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee: Person;
  priority: Priority;
  status: TaskStatus;
  deadline?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  archived: boolean;
  subtasks: Subtask[];
  comments: TaskComment[];
  repeat: RepeatInterval;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  progress: number; // 0–100
  linkedTaskIds: string[];
  status: "active" | "completed" | "paused";
  category: GoalCategory;
  createdAt: string;
  updatedAt: string;
}

export interface Idea {
  id: string;
  title: string;
  category: IdeaCategory;
  priority: "high" | "medium" | "low";
  notes?: string;
  tags: string[];
  createdAt: string;
  pinned: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  purpose: string;
  category: ExpenseCategory;
  person: Person;
  date: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  recurring: boolean;
  recurringInterval?: RepeatInterval;
}

export interface Activity {
  id: string;
  type: "created" | "updated" | "deleted" | "completed" | "commented";
  entityId: string;
  entityType: "task" | "goal" | "idea" | "expense";
  description: string;
  timestamp: string;
}

export interface AppSettings {
  theme: "dark" | "light";
  defaultTaskView: "kanban" | "list" | "calendar";
  currency: string;
  weekStart: "monday" | "sunday";
}

export interface AISummary {
  id: string;
  type: "daily" | "weekly" | "spending" | "task" | "chat";
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
