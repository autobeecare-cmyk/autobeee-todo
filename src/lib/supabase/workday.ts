import { supabase } from "../supabase";
import type { Workday, WorkdayEvent, FounderName, WorkdayStatus } from "../types";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";

// Utility to get current IST date (YYYY-MM-DD) and check time deadlines
export function getISTDateInfo(date = new Date()) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000 + istOffset);
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, "0");
  const day = String(istDate.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const dayOfWeek = istDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const isAfter12PM = hours >= 12;
  const isAfter3PM = hours >= 15;
  const isAfter7PM = hours >= 19;
  return { dateStr, hours, minutes, dayOfWeek, isAfter12PM, isAfter3PM, isAfter7PM, istDate };
}

export function mapWorkdayFromDb(dbItem: any): Workday {
  return {
    id: dbItem.id,
    founderName: dbItem.founder_name,
    workDate: dbItem.work_date,
    checkInAt: dbItem.check_in_at,
    checkOutAt: dbItem.check_out_at,
    status: dbItem.status as WorkdayStatus,
    progressNotes: dbItem.progress_notes,
    blockerNotes: dbItem.blocker_notes,
    tomorrowNotes: dbItem.tomorrow_notes,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at,
  };
}

// Trigger native push notification via Supabase Edge Function
export const notifyAttendanceChange = async (
  type: 'check_in' | 'check_out' | 'auto_check_out' | 'check_in_reminder' | 'auto_leave' | 'test',
  founderName: string,
  workday?: any,
  options?: { title?: string; body?: string; toUsers?: string[] }
) => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl) return;

    const res = await fetch(`${supabaseUrl}/functions/v1/notify-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        type,
        founderName,
        workday,
        title: options?.title,
        body: options?.body,
        toUsers: options?.toUsers,
      }),
    });

    if (!res.ok) {
      console.warn('Notify attendance returned status:', res.status, await res.text());
    } else {
      const data = await res.json().catch(() => ({}));
      console.log('Notify attendance succeeded:', data);
    }
  } catch (error) {
    console.error('Failed to send attendance push notification:', error);
    // Non-blocking
  }
};

export async function getTodayWorkdays(dateStr?: string): Promise<Workday[]> {
  const targetDate = dateStr || getISTDateInfo().dateStr;
  const { data, error } = await supabase
    .from("workdays")
    .select("*")
    .eq("work_date", targetDate);

  if (error) {
    console.error("Error fetching today workdays:", error);
    return [];
  }
  return (data || []).map(mapWorkdayFromDb);
}

export async function getAllWorkdays(limit = 100): Promise<Workday[]> {
  const { data, error } = await supabase
    .from("workdays")
    .select("*")
    .order("work_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching all workdays:", error);
    return [];
  }
  return (data || []).map(mapWorkdayFromDb);
}

export async function checkInOffice(founderName: FounderName): Promise<Workday> {
  const { dateStr, isAfter3PM } = getISTDateInfo();

  if (isAfter3PM) {
    throw new Error("Check-in is closed for today. It is past 3:00 PM IST.");
  }

  // Check if existing workday exists for today
  const existing = await supabase
    .from("workdays")
    .select("*")
    .eq("founder_name", founderName)
    .eq("work_date", dateStr)
    .maybeSingle();

  if (existing.data) {
    if (existing.data.status === "leave") {
      throw new Error("Today's attendance is closed — marked Leave.");
    }
    return mapWorkdayFromDb(existing.data);
  }

  // Create new workday
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("workdays")
    .insert({
      founder_name: founderName,
      work_date: dateStr,
      check_in_at: nowIso,
      status: "working",
    })
    .select()
    .single();

  if (error) {
    // Double check if constraint caught duplicate check-in
    if (error.code === "23505") {
      const retry = await supabase
        .from("workdays")
        .select("*")
        .eq("founder_name", founderName)
        .eq("work_date", dateStr)
        .single();
      if (retry.data) return mapWorkdayFromDb(retry.data);
    }
    throw error;
  }

  const workday = mapWorkdayFromDb(data);

  // Log event audit trail
  await supabase.from("workday_events").insert({
    workday_id: workday.id,
    founder_name: founderName,
    event_type: "check_in",
    timestamp: nowIso,
    metadata: { source: "manual" },
  });

  // Log company activity
  await logActivity({
    type: "created",
    entityId: workday.id,
    entityType: "task",
    description: `${founderName} checked in at the office.`,
  });

  // 1. Create in-app notification
  await createNotification({
    eventId: `workday_checkin_${workday.id}`,
    title: "Office Check-in",
    body: `${founderName} arrived at the office.`,
    recipient: "All",
    actor: founderName,
    type: "check_in",
  });

  // 2. Trigger native push notification
  await notifyAttendanceChange("check_in", founderName, workday);

  return workday;
}

export async function checkOutOffice(
  founderName: FounderName,
  notes?: { progress?: string; blocker?: string; tomorrow?: string }
): Promise<Workday> {
  const { dateStr } = getISTDateInfo();

  const { data: existing, error: fetchErr } = await supabase
    .from("workdays")
    .select("*")
    .eq("founder_name", founderName)
    .eq("work_date", dateStr)
    .single();

  if (fetchErr || !existing) {
    throw new Error("No active office check-in found for today.");
  }

  if (existing.status === "completed") {
    return mapWorkdayFromDb(existing);
  }

  if (existing.status === "leave") {
    throw new Error("Cannot checkout because day was marked Leave.");
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("workdays")
    .update({
      check_out_at: nowIso,
      status: "completed",
      progress_notes: notes?.progress || null,
      blocker_notes: notes?.blocker || null,
      tomorrow_notes: notes?.tomorrow || null,
      updated_at: nowIso,
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) throw error;

  const workday = mapWorkdayFromDb(data);

  // Log event audit trail
  await supabase.from("workday_events").insert({
    workday_id: workday.id,
    founder_name: founderName,
    event_type: "check_out",
    timestamp: nowIso,
    metadata: { source: "manual" },
  });

  // Log company activity
  await logActivity({
    type: "updated",
    entityId: workday.id,
    entityType: "task",
    description: `${founderName} ended their workday.`,
  });

  // 1. Create in-app notification
  await createNotification({
    eventId: `workday_checkout_${workday.id}`,
    title: "Office Check-out",
    body: `${founderName} left the office.`,
    recipient: "All",
    actor: founderName,
    type: "check_out",
  });

  // 2. Trigger native push notification
  await notifyAttendanceChange("check_out", founderName, workday);

  return workday;
}

// 7:00 PM IST Daily Automatic Checkout
export async function processAutoCheckoutServer(overrideDateStr?: string, force = false) {
  const { dateStr, isAfter7PM } = getISTDateInfo();
  const targetDate = overrideDateStr || dateStr;

  if (!overrideDateStr && !isAfter7PM && !force) {
    return { processed: 0, message: "Before 7:00 PM IST — auto-checkout skipped." };
  }

  // Find all workdays for today that are still working
  const { data: activeWorkdays, error: fetchErr } = await supabase
    .from("workdays")
    .select("*")
    .eq("work_date", targetDate)
    .eq("status", "working");

  if (fetchErr || !activeWorkdays || activeWorkdays.length === 0) {
    return { processed: 0, message: `No active check-ins found for ${targetDate}.` };
  }

  let count = 0;
  const nowIso = new Date().toISOString();

  for (const workday of activeWorkdays) {
    const { data: updated, error: updateErr } = await supabase
      .from("workdays")
      .update({
        check_out_at: nowIso,
        status: "completed",
        updated_at: nowIso,
      })
      .eq("id", workday.id)
      .select()
      .single();

    if (!updateErr && updated) {
      count++;

      // Log event
      await supabase.from("workday_events").insert({
        workday_id: workday.id,
        founder_name: workday.founder_name,
        event_type: "auto_check_out",
        timestamp: nowIso,
        metadata: { source: "automatic", reason: "7_pm_deadline" },
      });

      // Log activity
      await logActivity({
        type: "updated",
        entityId: workday.id,
        entityType: "task",
        description: `${workday.founder_name} was automatically checked out at 7:00 PM.`,
      });

      // Send in-app notification (idempotent)
      await createNotification({
        eventId: `workday_autocheckout_${workday.id}`,
        title: "Automatic Check-out",
        body: "You were automatically checked out at 7:00 PM.",
        recipient: workday.founder_name,
        actor: "System",
        type: "auto_check_out",
      });

      // Trigger native push notification
      await notifyAttendanceChange("auto_check_out", workday.founder_name, workday, {
        title: "Automatic Check-out",
        body: "You were automatically checked out at 7:00 PM.",
        toUsers: [workday.founder_name],
      });
    }
  }

  return { processed: count, message: `Auto-checkout completed for ${count} founders.` };
}

// 12:00 PM IST Monday-Friday Attendance Reminder
export async function processAttendanceReminderServer(overrideDateStr?: string, force = false) {
  const { dateStr, dayOfWeek, isAfter12PM } = getISTDateInfo();
  const targetDate = overrideDateStr || dateStr;

  // Monday to Friday check (1 = Mon, 5 = Fri)
  if (!force && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return { processed: 0, message: "Weekend in IST — skipping 12 PM reminder." };
  }

  if (!overrideDateStr && !isAfter12PM && !force) {
    return { processed: 0, message: "Before 12:00 PM IST — reminder skipped." };
  }

  const ALL_FOUNDERS: FounderName[] = ["Sourabh", "Asher", "Subin"];

  // Query existing check-ins
  const { data: existingWorkdays } = await supabase
    .from("workdays")
    .select("*")
    .eq("work_date", targetDate);

  const checkedInMap = new Set(
    (existingWorkdays || [])
      .filter((w: any) => w.status === "working" || w.status === "completed")
      .map((w: any) => w.founder_name)
  );

  const missingFounders = ALL_FOUNDERS.filter((f) => !checkedInMap.has(f));
  let count = 0;

  for (const founder of missingFounders) {
    const eventId = `attendance-reminder-${founder}-${targetDate}`;

    // Check if notification already exists for today
    const notif = await createNotification({
      eventId,
      title: "Office Check-in Reminder",
      body: "You haven't checked in today.",
      recipient: founder,
      actor: "System",
      type: "check_in_reminder",
    });

    if (notif) {
      count++;
      // Trigger native push notification
      await notifyAttendanceChange("check_in_reminder", founder, undefined, {
        title: "Office Check-in Reminder",
        body: "You haven't checked in today.",
        toUsers: [founder],
      });
    }
  }

  return {
    processed: count,
    missingFounders,
    message: `Attendance reminders sent to ${count} founder(s).`,
  };
}

// 3:00 PM IST Auto-Leave Process
export async function processAutoLeaveServer(overrideDateStr?: string) {
  const { dateStr, isAfter3PM } = getISTDateInfo();
  const targetDate = overrideDateStr || dateStr;

  if (!overrideDateStr && !isAfter3PM) {
    return { processed: 0, message: "Before 3:00 PM IST — auto-leave skipped." };
  }

  const ALL_FOUNDERS: FounderName[] = ["Sourabh", "Asher", "Subin"];

  const { data: existingWorkdays } = await supabase
    .from("workdays")
    .select("*")
    .eq("work_date", targetDate);

  const existingMap = new Map((existingWorkdays || []).map((w: any) => [w.founder_name, w]));
  let count = 0;

  for (const founder of ALL_FOUNDERS) {
    if (!existingMap.has(founder)) {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("workdays")
        .insert({
          founder_name: founder,
          work_date: targetDate,
          check_in_at: nowIso,
          status: "leave",
        })
        .select()
        .single();

      if (!error && data) {
        count++;
        // Log event
        await supabase.from("workday_events").insert({
          workday_id: data.id,
          founder_name: founder,
          event_type: "auto_leave",
          timestamp: nowIso,
        });

        // Log activity
        await logActivity({
          type: "created",
          entityId: data.id,
          entityType: "task",
          description: `${founder} was automatically marked Leave today (no office check-in before 3:00 PM).`,
        });

        // Send in-app notification
        await createNotification({
          eventId: `workday_autoleave_${targetDate}_${founder}`,
          title: "AutoBee OS Attendance",
          body: `${founder} was marked Leave today because no office check-in was recorded before 3:00 PM.`,
          recipient: "All",
          actor: "System",
          type: "auto_leave",
        });

        // Trigger native push notification
        await notifyAttendanceChange("auto_leave", founder, data);
      }
    }
  }

  return { processed: count, message: `Auto-leave processed for ${count} founders.` };
}

export function subscribeWorkdays(callback: () => void) {
  const channelId = `workdays-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "workdays" }, () => {
      callback();
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}
