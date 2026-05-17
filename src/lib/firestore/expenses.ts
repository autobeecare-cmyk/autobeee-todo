// src/lib/firestore/expenses.ts
import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Expense } from "@/lib/types";
import { logActivity } from "./activity";

const COL = "autobee_expenses";

export function subscribeExpenses(callback: (expenses: Expense[]) => void) {
  const q = query(collection(db, COL), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
  });
}

export async function createExpense(data: Omit<Expense, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: new Date().toISOString() });
  await logActivity({ type: "created", entityId: ref.id, entityType: "expense", description: `Expense ₹${data.amount} for "${data.purpose}"` });
  return ref.id;
}

export async function updateExpense(id: string, data: Partial<Expense>) {
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteExpense(id: string) {
  await deleteDoc(doc(db, COL, id));
}
