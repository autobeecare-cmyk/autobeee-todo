import { supabase } from "../supabase";
import type { Task } from "../types";

export function mapTaskFromDb(dbTask: any): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || undefined,
    assignee: dbTask.assignee,
    priority: dbTask.priority,
    status: dbTask.status,
    deadline: dbTask.deadline || undefined,
    tags: dbTask.tags || [],
    subtasks: dbTask.subtasks || [],
    comments: dbTask.comments || [],
    repeat: dbTask.repeat_interval || "none",
    pinned: dbTask.is_pinned || false,
    archived: false,
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at,
  };
}

export function mapTaskToDb(task: Partial<Task>): any {
  const dbTask: any = {};
  if (task.title !== undefined) dbTask.title = task.title;
  if (task.description !== undefined) dbTask.description = task.description;
  if (task.assignee !== undefined) dbTask.assignee = task.assignee;
  if (task.priority !== undefined) dbTask.priority = task.priority;
  if (task.status !== undefined) dbTask.status = task.status;
  if (task.deadline !== undefined) dbTask.deadline = task.deadline || null;
  if (task.tags !== undefined) dbTask.tags = task.tags;
  if (task.subtasks !== undefined) dbTask.subtasks = task.subtasks;
  if (task.comments !== undefined) dbTask.comments = task.comments;
  if (task.repeat !== undefined) dbTask.repeat_interval = task.repeat;
  if (task.pinned !== undefined) dbTask.is_pinned = task.pinned;
  return dbTask;
}

// Send notification when task changes
export const notifyTaskChange = async (
  type: 'created' | 'assigned' | 'completed' | 'updated',
  task: any
) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-task`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ type, task }),
      }
    )
    if (!res.ok) {
      const text = await res.text()
      console.error('Notify task function error:', res.status, text)
    } else {
      const data = await res.json()
      console.log('Notify task function succeeded:', data)
    }
  } catch (error) {
    console.error('Failed to send task notification:', error)
    // Don't throw — notification failure shouldn't break the app
  }
}

export const getTasks = async () => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapTaskFromDb);
};

export const createTask = async (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
  const dbData = mapTaskToDb(task);
  const { data, error } = await supabase
    .from("tasks")
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  await notifyTaskChange('created', data);
  return mapTaskFromDb(data);
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
  const dbData = mapTaskToDb(updates);
  const { data, error } = await supabase
    .from("tasks")
    .update(dbData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  // Detect if task was just completed
  const notifType = updates.status === 'done' ? 'completed' : 'updated';
  await notifyTaskChange(notifType, data);
  return mapTaskFromDb(data);
};

export const deleteTask = async (id: string) => {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id);
  if (error) throw error;
};

export const completeAndDeleteTask = async (id: string) => {
  await deleteTask(id);
};

export const duplicateTask = async (task: Task) => {
  const { id, createdAt, updatedAt, pinned, ...rest } = task;
  return await createTask({
    ...rest,
    title: `${rest.title} (copy)`,
    status: "todo",
    pinned: false,
  });
};

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  const channelId = `tasks-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, async () => {
      const tasks = await getTasks();
      callback(tasks);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
};
