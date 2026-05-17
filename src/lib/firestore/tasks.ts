// src/lib/firestore/tasks.ts
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, Timestamp, where,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task } from "@/lib/types";
import { logActivity } from "./activity";

const COL = "autobee_tasks";

export function subscribeTasks(callback: (tasks: Task[]) => void) {
  const q = query(
    collection(db, COL),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const tasks = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Task))
      .filter((t) => !t.archived);
    callback(tasks);
  });
}

export async function createTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  await logActivity({ type: "created", entityId: ref.id, entityType: "task", description: `Task "${data.title}" created` });
  return ref.id;
}

export async function updateTask(id: string, data: Partial<Task>) {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: new Date().toISOString() });
  await logActivity({ type: "updated", entityId: id, entityType: "task", description: `Task updated` });
}

export async function deleteTask(id: string, title: string) {
  await deleteDoc(doc(db, COL, id));
  await logActivity({ type: "deleted", entityId: id, entityType: "task", description: `Task "${title}" deleted` });
}

export async function archiveTask(id: string) {
  await updateDoc(doc(db, COL, id), { archived: true, updatedAt: new Date().toISOString() });
}

export async function duplicateTask(task: Task) {
  const { id, createdAt, updatedAt, ...rest } = task;
  const now = new Date().toISOString();
  return await addDoc(collection(db, COL), {
    ...rest,
    title: `${rest.title} (copy)`,
    status: "todo",
    pinned: false,
    createdAt: now,
    updatedAt: now,
  });
}
