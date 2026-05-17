// src/lib/firestore/goals.ts
import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Goal } from "@/lib/types";
import { logActivity } from "./activity";

const COL = "autobee_goals";

export function subscribeGoals(callback: (goals: Goal[]) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal)));
  });
}

export async function createGoal(data: Omit<Goal, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: now, updatedAt: now });
  await logActivity({ type: "created", entityId: ref.id, entityType: "goal", description: `Goal "${data.title}" created` });
  return ref.id;
}

export async function updateGoal(id: string, data: Partial<Goal>) {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteGoal(id: string, title: string) {
  await deleteDoc(doc(db, COL, id));
  await logActivity({ type: "deleted", entityId: id, entityType: "goal", description: `Goal "${title}" deleted` });
}
