// src/lib/firestore/ideas.ts
import { collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Idea } from "@/lib/types";
import { logActivity } from "./activity";

const COL = "autobee_ideas";

export function subscribeIdeas(callback: (ideas: Idea[]) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Idea)));
  });
}

export async function createIdea(data: Omit<Idea, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: new Date().toISOString() });
  await logActivity({ type: "created", entityId: ref.id, entityType: "idea", description: `Idea "${data.title}" added` });
  return ref.id;
}

export async function updateIdea(id: string, data: Partial<Idea>) {
  await updateDoc(doc(db, COL, id), data);
}

export async function deleteIdea(id: string, title: string) {
  await deleteDoc(doc(db, COL, id));
  await logActivity({ type: "deleted", entityId: id, entityType: "idea", description: `Idea "${title}" deleted` });
}
