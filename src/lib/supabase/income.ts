import { supabase } from "../supabase";
import type { Income, Person, IncomeCategory, IncomePaymentMethod } from "../types";

export function mapIncomeFromDb(dbInc: any): Income {
  return {
    id: dbInc.id,
    amount: parseFloat(dbInc.amount),
    source: dbInc.source,
    category: dbInc.category as IncomeCategory,
    receivedBy: dbInc.received_by as Person,
    date: dbInc.income_date ? dbInc.income_date.split("T")[0] : new Date().toISOString().split("T")[0],
    paymentMethod: dbInc.payment_method as IncomePaymentMethod,
    createdAt: dbInc.created_at,
    notes: dbInc.notes || undefined,
    relatedPartnerId: dbInc.related_partner_id || undefined,
    commissionRate: dbInc.commission_rate ? parseFloat(dbInc.commission_rate) : undefined,
  };
}

export function mapIncomeToDb(inc: Partial<Income>): any {
  const dbInc: any = {};
  if (inc.amount !== undefined) dbInc.amount = inc.amount;
  if (inc.source !== undefined) dbInc.source = inc.source;
  if (inc.category !== undefined) dbInc.category = inc.category;
  if (inc.receivedBy !== undefined) dbInc.received_by = inc.receivedBy;
  if (inc.date !== undefined) dbInc.income_date = inc.date;
  if (inc.paymentMethod !== undefined) dbInc.payment_method = inc.paymentMethod;
  if (inc.notes !== undefined) dbInc.notes = inc.notes || null;
  if (inc.relatedPartnerId !== undefined) dbInc.related_partner_id = inc.relatedPartnerId || null;
  if (inc.commissionRate !== undefined) dbInc.commission_rate = inc.commissionRate || null;
  return dbInc;
}

export const recalculatePartnerRevenue = async (partnerId: string) => {
  const { data: incomeList, error: incomeError } = await supabase
    .from("income")
    .select("amount")
    .eq("related_partner_id", partnerId);
  if (incomeError) throw incomeError;

  const totalRevenue = (incomeList || []).reduce((sum, item) => sum + parseFloat(item.amount), 0);

  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("commission_rate")
    .eq("id", partnerId)
    .single();
  if (partnerError) return; // Silent if partner not found

  const rate = partner?.commission_rate ? parseFloat(partner.commission_rate) : 0;
  const totalCommission = (totalRevenue * rate) / 100;

  await supabase
    .from("partners")
    .update({
      total_revenue_generated: totalRevenue,
      total_commission_earned: totalCommission
    })
    .eq("id", partnerId);
};

export const getIncome = async () => {
  const { data, error } = await supabase
    .from("income")
    .select("*")
    .order("income_date", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapIncomeFromDb);
};

export const createIncome = async (inc: Omit<Income, "id" | "createdAt">) => {
  const dbData = mapIncomeToDb(inc);
  const { data, error } = await supabase
    .from("income")
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  
  const mapped = mapIncomeFromDb(data);
  if (mapped.relatedPartnerId) {
    await recalculatePartnerRevenue(mapped.relatedPartnerId);
  }
  return mapped;
};

export const updateIncome = async (id: string, updates: Partial<Income>) => {
  // Fetch existing to know previous partner link
  const { data: existing } = await supabase
    .from("income")
    .select("related_partner_id")
    .eq("id", id)
    .single();
  const oldPartnerId = existing?.related_partner_id;

  const dbData = mapIncomeToDb(updates);
  const { data, error } = await supabase
    .from("income")
    .update(dbData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  
  const mapped = mapIncomeFromDb(data);
  if (oldPartnerId) {
    await recalculatePartnerRevenue(oldPartnerId);
  }
  if (mapped.relatedPartnerId && mapped.relatedPartnerId !== oldPartnerId) {
    await recalculatePartnerRevenue(mapped.relatedPartnerId);
  }
  return mapped;
};

export const deleteIncome = async (id: string) => {
  const { data: existing } = await supabase
    .from("income")
    .select("related_partner_id")
    .eq("id", id)
    .single();
  const oldPartnerId = existing?.related_partner_id;

  const { error } = await supabase
    .from("income")
    .delete()
    .eq("id", id);
  if (error) throw error;

  if (oldPartnerId) {
    await recalculatePartnerRevenue(oldPartnerId);
  }
};

export const subscribeToIncome = (callback: (income: Income[]) => void) => {
  const channelId = `income-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "income" }, async () => {
      const income = await getIncome();
      callback(income);
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};
