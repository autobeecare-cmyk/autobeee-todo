import { supabase } from "../supabase";
import type { ExpenseSplit, Settlement, FounderName, FounderLedger, PairwiseDebt, Expense } from "../types";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";

export async function getExpenseSplits(): Promise<ExpenseSplit[]> {
  const { data, error } = await supabase.from("expense_splits").select("*");
  if (error) {
    console.error("Error fetching expense splits:", error);
    return [];
  }
  return (data || []).map((dbItem: any) => ({
    id: dbItem.id,
    expenseId: dbItem.expense_id,
    expenseType: dbItem.expense_type,
    paidBy: dbItem.paid_by,
    splitMethod: dbItem.split_method,
    splitDetails: dbItem.split_details || [],
    createdAt: dbItem.created_at,
  }));
}

export async function createExpenseSplit(split: Omit<ExpenseSplit, "id" | "createdAt">): Promise<ExpenseSplit> {
  const { data, error } = await supabase
    .from("expense_splits")
    .insert({
      expense_id: split.expenseId,
      expense_type: split.expenseType,
      paid_by: split.paidBy,
      split_method: split.splitMethod,
      split_details: split.splitDetails,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    expenseId: data.expense_id,
    expenseType: data.expense_type,
    paidBy: data.paid_by,
    splitMethod: data.split_method,
    splitDetails: data.split_details || [],
    createdAt: data.created_at,
  };
}

export async function getSettlements(): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching settlements:", error);
    return [];
  }

  return (data || []).map((dbItem: any) => ({
    id: dbItem.id,
    payer: dbItem.payer,
    payee: dbItem.payee,
    amount: parseFloat(dbItem.amount),
    status: dbItem.status,
    notes: dbItem.notes,
    settledAt: dbItem.settled_at,
    confirmedBy: dbItem.confirmed_by,
    createdAt: dbItem.created_at,
  }));
}

export async function createSettlement(s: {
  payer: FounderName;
  payee: FounderName;
  amount: number;
  confirmedBy: FounderName;
  notes?: string;
}): Promise<Settlement> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("settlements")
    .insert({
      payer: s.payer,
      payee: s.payee,
      amount: s.amount,
      status: "paid",
      confirmed_by: s.confirmedBy,
      notes: s.notes || null,
      settled_at: nowIso,
    })
    .select()
    .single();

  if (error) throw error;

  const settlement: Settlement = {
    id: data.id,
    payer: data.payer,
    payee: data.payee,
    amount: parseFloat(data.amount),
    status: data.status,
    notes: data.notes,
    settledAt: data.settled_at,
    confirmedBy: data.confirmed_by,
    createdAt: data.created_at,
  };

  // Log activity
  await logActivity({
    type: "created",
    entityId: settlement.id,
    entityType: "expense",
    description: `${s.payer} settled ₹${s.amount.toLocaleString("en-IN")} with ${s.payee}.`,
  });

  // Dispatch notification
  await createNotification({
    eventId: `settlement_${settlement.id}`,
    title: "💸 Founder Settlement",
    body: `${s.payer} paid ₹${s.amount.toLocaleString("en-IN")} to ${s.payee}`,
    recipient: "All",
    actor: s.confirmedBy,
    type: "settlement",
  });

  return settlement;
}

const INITIAL_EXPENSE_IDS = new Set([
  "ca2e9f7c-7dff-44e1-8145-77fadcd76efd",
  "ae86a0b8-4b33-4485-9dd4-1f897dd6aafc",
  "50175da4-a051-4831-8abc-e249f2f71876",
  "0caebdf8-04c4-4377-94c6-e91056513f37",
  "67f6a6ad-8789-4430-9286-8e0539daa488",
  "75ea5536-c014-4cc1-b562-4fa6bd3599b6",
  "3bc56140-5a78-4d2b-8481-21ddb58fade5",
  "315d678f-e03b-4f0d-b0a7-a402f18945f1",
  "64a2d318-a46f-474e-8809-c8ee7abb8ed9",
  "a5258f4e-f9a7-47ae-8562-74d94ae99d79",
  "390e1a1f-28dc-4701-b83e-8e144562e72c",
  "e191f0df-aef0-46a0-aeac-b1dfedf1df39",
]);

export function computeFounderLedgerAndDebts(
  expenses: Expense[],
  splits: ExpenseSplit[],
  settlements: Settlement[]
): {
  ledgers: FounderLedger[];
  pairwiseDebts: PairwiseDebt[];
  founderPrepaidCompany: { founder: FounderName; amount: number }[];
  summary: {
    officeTotal: number;
    domainSimTotal: number;
    totalSharedExpenses: number;
    equalSharePerFounder: number;
    actualSpending: Record<FounderName, number>;
    transfersPaid: Record<FounderName, number>;
    transfersReceived: Record<FounderName, number>;
    effectiveContributions: Record<FounderName, number>;
  };
} {
  const ALL_FOUNDERS: FounderName[] = ["Sourabh", "Asher", "Subin"];
  const splitMap = new Map<string, ExpenseSplit>();
  splits.forEach((s) => splitMap.set(s.expenseId, s));

  // 1. Authoritative baseline figures from founder account:
  // Office expenses = ₹32,293
  // Domain + SIM = ₹1,499
  // Total Gross Company Spending = ₹33,792
  const officeTotal = 32293;
  const domainSimTotal = 1499;
  let totalSharedExpenses = officeTotal + domainSimTotal; // ₹33,792

  // Gross Actual Spending per founder:
  // Sourabh: ₹10,600
  // Subin: ₹10,000
  // Asher: ₹13,192
  const actualSpending: Record<FounderName, number> = {
    Sourabh: 10600,
    Subin: 10000,
    Asher: 13192,
  };

  // Founder-to-founder transfer already paid:
  // Sourabh gave Asher ₹500 for Domain + SIM split (NOT a company expense)
  const transfersPaid: Record<FounderName, number> = { Sourabh: 500, Subin: 0, Asher: 0 };
  const transfersReceived: Record<FounderName, number> = { Sourabh: 0, Subin: 0, Asher: 500 };

  // Effective Contributions:
  // Sourabh: 10,600 + 500 = ₹11,100
  // Subin: 10,000 + 0 = ₹10,000
  // Asher: 13,192 - 500 = ₹12,692
  const effectiveContributions: Record<FounderName, number> = {
    Sourabh: actualSpending.Sourabh + transfersPaid.Sourabh - transfersReceived.Sourabh,
    Subin: actualSpending.Subin + transfersPaid.Subin - transfersReceived.Subin,
    Asher: actualSpending.Asher + transfersPaid.Asher - transfersReceived.Asher,
  };

  const fairShare: Record<FounderName, number> = {
    Sourabh: 33792 / 3, // ₹11,264
    Subin: 33792 / 3,   // ₹11,264
    Asher: 33792 / 3,   // ₹11,264
  };

  const companyOwed: Record<FounderName, number> = { Sourabh: 0, Asher: 0, Subin: 0 };

  // Process ONLY NEW expenses created dynamically (skip initial 12 historical expenses baseline)
  for (const exp of expenses) {
    if (INITIAL_EXPENSE_IDS.has(exp.id)) continue;

    const split = splitMap.get(exp.id);
    totalSharedExpenses += exp.amount;

    if (split && split.paidBy !== "Company Account" && ALL_FOUNDERS.includes(split.paidBy as FounderName)) {
      const payer = split.paidBy as FounderName;
      actualSpending[payer] += exp.amount;
      effectiveContributions[payer] += exp.amount;

      if (split.expenseType === "shared_founder" || split.expenseType === "founder_specific") {
        for (const d of split.splitDetails) {
          fairShare[d.founder] += d.amount;
        }
      } else if (split.expenseType === "founder_paid_company") {
        companyOwed[payer] += exp.amount;
      }
    } else if (!split && ALL_FOUNDERS.includes(exp.person as FounderName)) {
      const payer = exp.person as FounderName;
      actualSpending[payer] += exp.amount;
      effectiveContributions[payer] += exp.amount;
      for (const f of ALL_FOUNDERS) {
        fairShare[f] += exp.amount / 3;
      }
    }
  }

  // Calculate initial net balances: positive = owes money, negative = is owed money
  const netDebts: Record<FounderName, number> = {
    Sourabh: Math.round(fairShare.Sourabh - effectiveContributions.Sourabh),
    Subin: Math.round(fairShare.Subin - effectiveContributions.Subin),
    Asher: Math.round(fairShare.Asher - effectiveContributions.Asher),
  };

  // Deduct settlements marked as paid in DB
  for (const s of settlements) {
    if (s.status === "paid") {
      netDebts[s.payer] -= s.amount;
      netDebts[s.payee] += s.amount;
    }
  }

  // Consolidate net balances into minimum pairwise debts
  const debtors = ALL_FOUNDERS.filter((f) => netDebts[f] > 0);
  const creditors = ALL_FOUNDERS.filter((f) => netDebts[f] < 0);

  const pairwiseDebts: PairwiseDebt[] = [];
  const remainingDebts = { ...netDebts };

  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (remainingDebts[debtor] <= 0) break;
      const owedToCreditor = -remainingDebts[creditor];
      if (owedToCreditor <= 0) continue;

      const settlementAmt = Math.min(remainingDebts[debtor], owedToCreditor);
      if (settlementAmt > 0) {
        pairwiseDebts.push({
          payer: debtor,
          payee: creditor,
          amount: Math.round(settlementAmt),
        });
        remainingDebts[debtor] -= settlementAmt;
        remainingDebts[creditor] += settlementAmt;
      }
    }
  }

  // Compute ledgers
  const ledgers: FounderLedger[] = ALL_FOUNDERS.map((f) => {
    // Net balance: positive = owed money, negative = owes money
    const net = -netDebts[f];

    return {
      founder: f,
      actualSpending: actualSpending[f],
      transferPaid: transfersPaid[f],
      transferReceived: transfersReceived[f],
      effectiveContribution: effectiveContributions[f],
      fairShare: Math.round(fairShare[f]),
      netBalance: Math.round(net),
    };
  });

  const founderPrepaidCompany = ALL_FOUNDERS.map((f) => ({
    founder: f,
    amount: companyOwed[f],
  })).filter((c) => c.amount > 0);

  const equalSharePerFounder = Math.round(totalSharedExpenses / 3);

  return {
    ledgers,
    pairwiseDebts,
    founderPrepaidCompany,
    summary: {
      officeTotal,
      domainSimTotal,
      totalSharedExpenses,
      equalSharePerFounder,
      actualSpending,
      transfersPaid,
      transfersReceived,
      effectiveContributions,
    },
  };
}

export function subscribeSettlements(callback: () => void) {
  const channelId = `settlements-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "settlements" }, () => {
      callback();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "expense_splits" }, () => {
      callback();
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}
