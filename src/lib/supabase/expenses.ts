import { supabase } from "../supabase";
import type { Expense } from "../types";

const EXP_CAT_MAP_TO_DB: Record<string, string> = {
  fuel: "Fuel",
  travel: "Travel",
  marketing: "Marketing",
  food: "Food",
  meetings: "Meetings",
  software: "Software",
  subscriptions: "Subscriptions",
  development: "Development",
  equipment: "Equipment",
  operations: "Operations",
  misc: "Misc",
};

const EXP_CAT_MAP_FROM_DB: Record<string, any> = {
  Fuel: "fuel",
  Travel: "travel",
  Marketing: "marketing",
  Food: "food",
  Meetings: "meetings",
  Software: "software",
  Subscriptions: "subscriptions",
  Development: "development",
  Equipment: "equipment",
  Operations: "operations",
  Misc: "misc",
};

const PAY_METHOD_MAP_TO_DB: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank: "Bank transfer",
};

const PAY_METHOD_MAP_FROM_DB: Record<string, any> = {
  Cash: "cash",
  UPI: "upi",
  Card: "card",
  "Bank transfer": "bank",
};

export function mapExpenseFromDb(dbExp: any): Expense {
  return {
    id: dbExp.id,
    amount: parseFloat(dbExp.amount),
    purpose: dbExp.purpose,
    category: EXP_CAT_MAP_FROM_DB[dbExp.category] || "misc",
    person: dbExp.paid_by,
    date: dbExp.expense_date ? dbExp.expense_date.split("T")[0] : new Date().toISOString().split("T")[0],
    paymentMethod: PAY_METHOD_MAP_FROM_DB[dbExp.payment_method] || "upi",
    createdAt: dbExp.created_at,
    recurring: dbExp.is_recurring || false,
    recurringInterval: dbExp.recurring_interval || undefined,
  };
}

export function mapExpenseToDb(exp: Partial<Expense>): any {
  const dbExp: any = {};
  if (exp.amount !== undefined) dbExp.amount = exp.amount;
  if (exp.purpose !== undefined) dbExp.purpose = exp.purpose;
  if (exp.category !== undefined) {
    dbExp.category = EXP_CAT_MAP_TO_DB[exp.category] || "Misc";
  }
  if (exp.person !== undefined) dbExp.paid_by = exp.person;
  if (exp.date !== undefined) dbExp.expense_date = exp.date;
  if (exp.paymentMethod !== undefined) {
    dbExp.payment_method = PAY_METHOD_MAP_TO_DB[exp.paymentMethod] || "UPI";
  }
  if (exp.recurring !== undefined) dbExp.is_recurring = exp.recurring;
  if (exp.recurringInterval !== undefined) dbExp.recurring_interval = exp.recurringInterval || null;
  return dbExp;
}

export const getExpenses = async () => {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapExpenseFromDb);
};

export const createExpense = async (exp: Omit<Expense, "id" | "createdAt">) => {
  const dbData = mapExpenseToDb(exp);
  const { data, error } = await supabase
    .from("expenses")
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  return mapExpenseFromDb(data);
};

export const updateExpense = async (id: string, updates: Partial<Expense>) => {
  const dbData = mapExpenseToDb(updates);
  const { data, error } = await supabase
    .from("expenses")
    .update(dbData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapExpenseFromDb(data);
};

export const deleteExpense = async (id: string) => {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);
  if (error) throw error;
};

export const subscribeToExpenses = (callback: (expenses: Expense[]) => void) => {
  const channelId = `expenses-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, async () => {
      const expenses = await getExpenses();
      callback(expenses);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
};
