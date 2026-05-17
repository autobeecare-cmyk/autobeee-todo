// src/lib/firestore/activity.ts
import { collection, addDoc, query, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Activity } from "@/lib/types";

const COL = "autobee_activity";

export async function logActivity(data: Omit<Activity, "id" | "timestamp">) {
  await addDoc(collection(db, COL), { ...data, timestamp: new Date().toISOString() });
}

export function subscribeActivity(callback: (items: Activity[]) => void, n = 20) {
  const q = query(collection(db, COL), orderBy("timestamp", "desc"), limit(n));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity)));
  });
}
