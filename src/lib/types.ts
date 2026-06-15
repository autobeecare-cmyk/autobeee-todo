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

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  location?: string;
  meetingLink?: string;
  attendees: Person[];
  status: "upcoming" | "completed" | "cancelled";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type IncomeCategory = "Client" | "Investment" | "Grant" | "Loan" | "Revenue" | "Other";
export type IncomePaymentMethod = "Cash" | "UPI" | "Card" | "Bank transfer";

export interface Income {
  id: string;
  amount: number;
  source: string;
  category: IncomeCategory;
  receivedBy: Person;
  paymentMethod: IncomePaymentMethod;
  date: string;
  notes?: string;
  createdAt: string;
  relatedPartnerId?: string;
  commissionRate?: number;
}

export interface Partner {
  id: string;
  survey_id?: string;
  name: string;
  owner_name?: string;
  phone?: string;
  alternate_phone?: string;
  google_maps_link?: string;
  photo_url?: string;
  partner_type: 'Car Wash' | 'Mechanic' | 'Detailing Studio' | 'Multi-Service' | 'Tyre Shop' | 'Auto Spa' | 'Other';
  tier: 'Basic' | 'Standard' | 'Premium' | 'Multi-Service';
  area: string;
  city: string;
  state: string;
  full_address?: string;
  pipeline_status: 'Wishlist' | 'Contacted' | 'Follow-Up' | 'Interested' | 'Negotiating' | 'Joined' | 'Rejected' | 'Paused';
  interest_level?: 'High' | 'Medium' | 'Low' | 'Unknown';
  interested_in_partnership?: boolean;
  follow_up_needed?: boolean;
  follow_up_method?: 'Call' | 'WhatsApp' | 'Visit' | 'Email';
  next_follow_up_date?: string;
  last_contacted_date?: string;
  contacted_by?: string[];
  services?: string[];
  avg_weekday_cars?: number;
  avg_weekend_cars?: number;
  peak_business_time?: string;
  biggest_issue?: string;
  price_hatchback?: number;
  price_sedan?: number;
  price_suv?: number;
  commission_rate?: number;
  total_revenue_generated?: number;
  total_commission_earned?: number;
  onboarded_date?: string;
  notes?: string;
  internal_notes?: string;
  added_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerInteraction {
  id: string;
  partner_id: string;
  interaction_type: 'Call' | 'WhatsApp' | 'Visit' | 'Email' | 'Meeting';
  outcome: 'Positive' | 'Neutral' | 'Negative' | 'No Response';
  notes?: string;
  next_action?: string;
  performed_by: string;
  interaction_date: string;
  created_at: string;
}

export interface Document {
  id: string;
  name: string;
  description?: string;
  file_url: string;
  file_type: 'pdf' | 'image' | 'doc' | 'sheet' | 'other';
  file_size_bytes?: number;
  mime_type?: string;
  category: 'Legal' | 'Contracts' | 'Finance' | 'Marketing' | 'Operations' | 'Research' | 'Partner Docs' | 'General';
  tags?: string[];
  related_partner_id?: string;
  uploaded_by: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}



