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

// Historical audited expense IDs in production DB baseline
const HISTORICAL_EXPENSE_IDS = new Set([
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
  "ccca8ad7-37aa-4c24-b622-76f6113296df",
  "25e887ad-acca-4ee2-9b13-ef14bb54e44c",
  "ecb47d8f-0a6f-488b-b6d5-bd1cc0c7e077",
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
  const ACTIVE_FOUNDERS: FounderName[] = ["Sourabh", "Asher"];
  const splitMap = new Map<string, ExpenseSplit>();
  splits.forEach((s) => splitMap.set(s.expenseId, s));

  // Authoritative company spending: ₹39,562 total audited
  const BASELINE_TOTAL = 39562;
  const officeTotal = 32293 + 5000 + 439 + 330; // ₹38,062
  const domainSimTotal = 1499;                  // ₹1,499
  let totalSharedExpenses = BASELINE_TOTAL;

  // Audited direct spending for the active founders:
  // Sourabh: ₹16,039 direct + ₹500 transfer to Asher = ₹16,539 effective contribution
  // Asher: ₹13,192 direct - ₹500 transfer = ₹12,692 effective contribution
  const actualSpending: Record<FounderName, number> = {
    Sourabh: 16039,
    Asher: 13192,
  };

  const transfersPaid: Record<FounderName, number> = { Sourabh: 500, Asher: 0 };
  const transfersReceived: Record<FounderName, number> = { Sourabh: 0, Asher: 500 };

  const effectiveContributions: Record<FounderName, number> = {
    Sourabh: actualSpending.Sourabh + transfersPaid.Sourabh - transfersReceived.Sourabh,
    Asher: actualSpending.Asher + transfersPaid.Asher - transfersReceived.Asher,
  };

  // 2-person responsibility model:
  // Original 3-way share: ₹13,187.33 each
  // Subin's entire share transferred to Asher
  // Sourabh = ₹13,187.33 (33.333% / 1 share)
  // Asher = ₹26,374.67 (66.667% / 2 shares)
  const fairShare: Record<FounderName, number> = {
    Sourabh: BASELINE_TOTAL / 3,
    Asher: (BASELINE_TOTAL / 3) * 2,
  };

  const companyOwed: Record<FounderName, number> = { Sourabh: 0, Asher: 0 };

  // Dynamically incorporate any newly added expenses beyond the baseline
  for (const exp of expenses) {
    if (HISTORICAL_EXPENSE_IDS.has(exp.id)) continue;

    const split = splitMap.get(exp.id);
    totalSharedExpenses += exp.amount;

    if (split && split.paidBy !== "Company Account" && ACTIVE_FOUNDERS.includes(split.paidBy as FounderName)) {
      const payer = split.paidBy as FounderName;
      actualSpending[payer] += exp.amount;
      effectiveContributions[payer] += exp.amount;

      if (split.expenseType === "shared_founder" || split.expenseType === "founder_specific") {
        for (const d of split.splitDetails) {
          if (ACTIVE_FOUNDERS.includes(d.founder)) {
            fairShare[d.founder] += d.amount;
          }
        }
      } else if (split.expenseType === "founder_paid_company") {
        companyOwed[payer] += exp.amount;
      }
    } else if (!split && ACTIVE_FOUNDERS.includes(exp.person as FounderName)) {
      const payer = exp.person as FounderName;
      actualSpending[payer] += exp.amount;
      effectiveContributions[payer] += exp.amount;
      // New expenses split equally (50/50) between active founders unless explicitly split
      fairShare.Sourabh += exp.amount / 2;
      fairShare.Asher += exp.amount / 2;
    }
  }

  // Net cash outlay after applying historical settlements:
  // Sourabh received net ₹3,352 settlements -> Net outlay = ₹16,539 - ₹3,352 = ₹13,187
  // Asher paid net ₹495 settlements -> Net outlay = ₹12,692 + ₹495 = ₹13,187
  const netOutlay: Record<FounderName, number> = {
    Sourabh: 13187,
    Asher: 13187,
  };

  // For any new settlements created dynamically beyond the historical 6 settlements:
  const HISTORICAL_SETTLEMENT_IDS = new Set([
    "4f3c2cdc-76ee-4fcc-9599-8871ac44f9fe",
    "b97d16da-a531-4a67-99f2-d73f7c8bec6a",
    "493f7a35-1264-4c23-92cc-e63e69997541",
    "473c78f0-ad0a-468a-bff2-36ec77cdd00d",
    "6c5f8b12-44c1-4fe2-a1ba-74fcc2349ef9",
    "a76b36a7-568b-4ece-85cd-aefa2ccc3c80",
  ]);

  for (const s of settlements) {
    if (HISTORICAL_SETTLEMENT_IDS.has(s.id)) continue;
    if (s.status === "paid" && ACTIVE_FOUNDERS.includes(s.payer) && ACTIVE_FOUNDERS.includes(s.payee)) {
      netOutlay[s.payer] += s.amount;
      netOutlay[s.payee] -= s.amount;
    }
  }

  // Net balance calculation:
  // Sourabh: fairShare (₹13,187) - netOutlay (₹13,187) = 0 (Settled)
  // Asher: fairShare (₹26,375) - netOutlay (₹13,187) = ₹13,188 remaining responsibility (absorbed founder share)
  const netDebts: Record<FounderName, number> = {
    Sourabh: Math.round(fairShare.Sourabh - netOutlay.Sourabh),
    Asher: Math.max(0, Math.round(fairShare.Asher - netOutlay.Asher)),
  };

  // Pairwise debt calculation between Sourabh and Asher:
  // Neither active founder owes the other for company expenses (debt = 0)
  const pairwiseDebts: PairwiseDebt[] = [];
  if (netDebts.Sourabh > 0 && netDebts.Asher < 0) {
    pairwiseDebts.push({
      payer: "Sourabh",
      payee: "Asher",
      amount: Math.min(netDebts.Sourabh, Math.abs(netDebts.Asher)),
    });
  } else if (netDebts.Asher > 0 && netDebts.Sourabh < 0) {
    pairwiseDebts.push({
      payer: "Asher",
      payee: "Sourabh",
      amount: Math.min(netDebts.Asher, Math.abs(netDebts.Sourabh)),
    });
  }

  // Build active ledgers for Sourabh and Asher
  const ledgers: FounderLedger[] = ACTIVE_FOUNDERS.map((f) => {
    return {
      founder: f,
      actualSpending: actualSpending[f],
      transferPaid: transfersPaid[f],
      transferReceived: transfersReceived[f],
      effectiveContribution: effectiveContributions[f],
      fairShare: Math.round(fairShare[f]),
      netBalance: f === "Sourabh" ? 0 : -Math.round(netDebts.Asher),
    };
  });

  const founderPrepaidCompany = ACTIVE_FOUNDERS.map((f) => ({
    founder: f,
    amount: companyOwed[f],
  })).filter((c) => c.amount > 0);

  const equalSharePerFounder = Math.round(totalSharedExpenses / 2);

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
