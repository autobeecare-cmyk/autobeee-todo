import { supabase } from "../supabase";
import type { Workday, WorkdayEvent, FounderName, WorkdayStatus } from "../types";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";

// Non-negotiable Office Location constants
export const AUTOBEE_OFFICE_LAT = 8.499781115980776;
export const AUTOBEE_OFFICE_LNG = 76.95807762836998;
export const AUTOBEE_OFFICE_RADIUS_METERS = 150;

// Geodesic distance calculation via Haversine formula
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number = AUTOBEE_OFFICE_LAT,
  lon2: number = AUTOBEE_OFFICE_LNG
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Utility to get current IST date (YYYY-MM-DD) and check time deadlines in Asia/Kolkata
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
  const isAfter10AM = hours >= 10;
  const isAfter12PM = hours >= 12;
  const isAfter3PM = hours >= 15;
  const isAfter7PM = hours >= 19;
  return { dateStr, hours, minutes, dayOfWeek, isAfter10AM, isAfter12PM, isAfter3PM, isAfter7PM, istDate };
}

/**
 * Helper to check if a workday check-in is Late.
 * Rule: Check-in at or after 12:00 PM Asia/Kolkata is Late; before 12:00 PM is NOT Late.
 * Asia/Kolkata is UTC+5:30 with no DST.
 */
export function isLateCheckIn(
  w?: { checkInAt?: string | null } | string | Date | null
): boolean {
  if (!w) return false;
  let timeMs: number;
  if (typeof w === "string") {
    timeMs = new Date(w).getTime();
  } else if (w instanceof Date) {
    timeMs = w.getTime();
  } else if (w.checkInAt) {
    timeMs = new Date(w.checkInAt).getTime();
  } else {
    return false;
  }

  if (isNaN(timeMs)) return false;
  // Shift UTC epoch by +5.5 hours to evaluate in Asia/Kolkata
  const istDate = new Date(timeMs + 5.5 * 60 * 60 * 1000);
  const hour = istDate.getUTCHours();
  return hour >= 12;
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
    checkInLatitude: dbItem.check_in_latitude,
    checkInLongitude: dbItem.check_in_longitude,
    checkInAccuracy: dbItem.check_in_accuracy,
    checkInLocationTimestamp: dbItem.check_in_location_timestamp,
    checkInMethod: dbItem.check_in_method,
    checkOutSource: dbItem.check_out_source || null,
    // Break state — authoritative server-persisted values
    totalBreakMs: typeof dbItem.total_break_ms === 'number' ? dbItem.total_break_ms : 0,
    breakStartedAt: dbItem.break_started_at || null,
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

export interface LocationCheckInParams {
  founderName: FounderName;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp?: number | string;
}

// Location-based check-in with independent server-side validation
export async function checkInOfficeWithLocation(params: LocationCheckInParams): Promise<Workday> {
  const { founderName, latitude, longitude, accuracy, timestamp } = params;

  // 1. Client-side sanity checks
  const { isAfter3PM } = getISTDateInfo();
  if (isAfter3PM) {
    throw new Error("Check-in is closed for today.");
  }

  const distance = calculateHaversineDistance(latitude, longitude);
  if (distance > AUTOBEE_OFFICE_RADIUS_METERS) {
    throw new Error(`You're outside the office. Move closer to the office to check in. (You're approximately ${Math.round(distance)}m away)`);
  }

  // 2. Dispatch to server API route for independent validation & record insertion
  const res = await fetch("/api/attendance/check-in", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      founderName,
      latitude,
      longitude,
      accuracy,
      timestamp: timestamp || Date.now(),
    }),
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok || !result.success) {
    throw new Error(result.error || "Couldn't check you in. Please try again.");
  }

  return mapWorkdayFromDb(result.workday);
}

export async function checkInOffice(
  founderName: FounderName,
  coords?: { latitude: number; longitude: number; accuracy: number; timestamp?: number | string }
): Promise<Workday> {
  if (coords) {
    return checkInOfficeWithLocation({
      founderName,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: coords.timestamp,
    });
  }

  const { dateStr, isAfter3PM } = getISTDateInfo();

  if (isAfter3PM) {
    throw new Error("Check-in is closed for today.");
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
    metadata: { source: "location" },
  });

  // Log company activity — correct entityType (BUG-7 fix)
  await logActivity({
    type: "created",
    entityId: workday.id,
    entityType: "workday" as any,
    description: `${founderName} checked in at the office.`,
  });

  // In-app notification
  await createNotification({
    eventId: `workday_checkin_${workday.id}`,
    title: "Office Check-in",
    body: `${founderName} arrived at the office.`,
    recipient: "All",
    actor: founderName,
    type: "check_in",
  });

  // Native push notification
  await notifyAttendanceChange("check_in", founderName, workday);

  return workday;
}

// ─────────────────────────────────────────────────────────────────────────────
// BREAK SUPPORT — Server-persisted, cross-device authoritative
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start a break for the given founder.
 * Updates workdays.status = 'on_break', sets break_started_at, inserts break_start event.
 * Guard: only works if current status is 'working' (prevents double-break).
 */
export async function startBreak(founderName: FounderName): Promise<Workday> {
  const { dateStr } = getISTDateInfo();

  const { data: existing, error: fetchErr } = await supabase
    .from("workdays")
    .select("*")
    .eq("founder_name", founderName)
    .eq("work_date", dateStr)
    .single();

  if (fetchErr || !existing) {
    throw new Error("No active workday found. Please check in first.");
  }

  if (existing.status === "on_break") {
    // Already on break — idempotent, return current state
    return mapWorkdayFromDb(existing);
  }

  if (existing.status !== "working") {
    throw new Error(`Cannot start a break when workday status is '${existing.status}'.`);
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("workdays")
    .update({
      status: "on_break",
      break_started_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) throw error;

  // Audit trail event
  await supabase.from("workday_events").insert({
    workday_id: existing.id,
    founder_name: founderName,
    event_type: "break_start",
    timestamp: nowIso,
    metadata: { source: "manual" },
  });

  return mapWorkdayFromDb(data);
}

/**
 * End a break for the given founder.
 * Updates workdays.status = 'working', clears break_started_at, accumulates total_break_ms,
 * inserts break_end event.
 * Guard: only works if current status is 'on_break' (prevents phantom resume).
 */
export async function endBreak(founderName: FounderName): Promise<Workday> {
  const { dateStr } = getISTDateInfo();

  const { data: existing, error: fetchErr } = await supabase
    .from("workdays")
    .select("*")
    .eq("founder_name", founderName)
    .eq("work_date", dateStr)
    .single();

  if (fetchErr || !existing) {
    throw new Error("No active workday found.");
  }

  if (existing.status === "working") {
    // Already working — idempotent, return current state
    return mapWorkdayFromDb(existing);
  }

  if (existing.status !== "on_break") {
    throw new Error(`Cannot end a break when workday status is '${existing.status}'.`);
  }

  const nowIso = new Date().toISOString();
  const nowMs = new Date(nowIso).getTime();

  // Compute elapsed break duration from server-authoritative break_started_at
  const breakStartMs = existing.break_started_at
    ? new Date(existing.break_started_at).getTime()
    : nowMs;
  const elapsedBreakMs = Math.max(0, nowMs - breakStartMs);
  const newTotalBreakMs = (existing.total_break_ms || 0) + elapsedBreakMs;

  const { data, error } = await supabase
    .from("workdays")
    .update({
      status: "working",
      break_started_at: null,
      total_break_ms: newTotalBreakMs,
      updated_at: nowIso,
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) throw error;

  // Audit trail event
  await supabase.from("workday_events").insert({
    workday_id: existing.id,
    founder_name: founderName,
    event_type: "break_end",
    timestamp: nowIso,
    metadata: { source: "manual", break_duration_ms: elapsedBreakMs },
  });

  return mapWorkdayFromDb(data);
}

/**
 * Compute the total live break duration in milliseconds from a workday record.
 * - If currently on_break: totalBreakMs + (now - breakStartedAt)
 * - Otherwise: totalBreakMs
 * Capped at 7 PM IST cutoff.
 */
export function computeLiveBreakMs(
  workday: { status: string; totalBreakMs: number; breakStartedAt?: string | null; workDate: string }
): number {
  const sevenPmMs = new Date(`${workday.workDate}T19:00:00+05:30`).getTime();
  const effectiveNow = Math.min(Date.now(), sevenPmMs);

  if (workday.status === "on_break" && workday.breakStartedAt) {
    const breakStartMs = new Date(workday.breakStartedAt).getTime();
    const activeMs = Math.max(0, effectiveNow - breakStartMs);
    return workday.totalBreakMs + activeMs;
  }
  return workday.totalBreakMs;
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
      check_out_source: "manual", // BUG-6 fix
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

  // Log company activity — correct entityType (BUG-7 fix)
  await logActivity({
    type: "updated",
    entityId: workday.id,
    entityType: "workday" as any,
    description: `${founderName} ended their workday.`,
  });

  // In-app notification
  await createNotification({
    eventId: `workday_checkout_${workday.id}`,
    title: "Office Check-out",
    body: `${founderName} left the office.`,
    recipient: "All",
    actor: founderName,
    type: "check_out",
  });

  // Native push notification
  await notifyAttendanceChange("check_out", founderName, workday);

  return workday;
}

// 7:00 PM IST Daily Automatic Checkout
// Closes any open workdays (status = 'working') at 7:00 PM Asia/Kolkata
export async function processAutoCheckoutServer(overrideDateStr?: string, force = false) {
  const { dateStr, isAfter7PM } = getISTDateInfo();
  const targetDate = overrideDateStr || dateStr;

  if (!overrideDateStr && !force && !isAfter7PM) {
    return { processed: 0, message: "Before 7:00 PM IST — automatic checkout skipped." };
  }

  const { data: openWorkdays, error: fetchErr } = await supabase
    .from("workdays")
    .select("*")
    .eq("work_date", targetDate)
    .in("status", ["working", "on_break"]);

  if (fetchErr) {
    console.error("Error querying open workdays for 7 PM checkout:", fetchErr);
    throw fetchErr;
  }

  let count = 0;
  const nowIso = new Date().toISOString();

  for (const record of openWorkdays || []) {
    const breakStartedAt = record.break_started_at;
    const currentTotalBreakMs = record.total_break_ms || 0;
    let finalBreakMs = currentTotalBreakMs;

    // If the workday is currently on_break, close the active break first
    if (record.status === "on_break" && breakStartedAt) {
      const breakStartMs = new Date(breakStartedAt).getTime();
      const elapsedMs = Math.max(0, new Date(nowIso).getTime() - breakStartMs);
      finalBreakMs = currentTotalBreakMs + elapsedMs;

      // Insert break_end event before the auto_check_out
      await supabase.from("workday_events").insert({
        workday_id: record.id,
        founder_name: record.founder_name,
        event_type: "break_end",
        timestamp: nowIso,
        metadata: { source: "auto_7pm", auto_ended_break: true },
      });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("workdays")
      .update({
        check_out_at: nowIso,
        status: "completed",
        check_out_source: "auto_7pm",
        total_break_ms: finalBreakMs,
        break_started_at: null,
        updated_at: nowIso,
      })
      .eq("id", record.id)
      .select()
      .single();

    if (!updateErr && updated) {
      count++;

      // 1. Audit trail event
      await supabase.from("workday_events").insert({
        workday_id: updated.id,
        founder_name: updated.founder_name,
        event_type: "auto_check_out",
        timestamp: nowIso,
        metadata: { source: "auto_7pm" },
      });

      // 2. Log company activity
      await logActivity({
        type: "updated",
        entityId: updated.id,
        entityType: "workday" as any,
        description: `${updated.founder_name}'s workday was automatically closed at 7:00 PM.`,
      });

      // 3. In-app notification (idempotent via eventId)
      await createNotification({
        eventId: `workday_autocheckout_${targetDate}_${updated.founder_name}`,
        title: "Workday Closed",
        body: `Your workday was automatically closed at 7:00 PM IST.`,
        recipient: updated.founder_name as FounderName,
        actor: "System",
        type: "auto_check_out",
      });

      // 4. Dispatch FCM push notification
      await notifyAttendanceChange("auto_check_out", updated.founder_name, updated, {
        title: "Workday Closed (7:00 PM)",
        body: "Your office workday has been automatically closed.",
        toUsers: [updated.founder_name],
      });
    } else if (updateErr) {
      console.error(`Failed to auto-checkout ${record.founder_name}:`, updateErr);
    }
  }

  return {
    processed: count,
    targetDate,
    message: `7:00 PM auto-checkout completed for ${count} open workday(s).`,
  };
}

// 10:00 AM & 12:00 PM IST Monday-Friday Attendance Reminders
export async function processAttendanceReminderServer(
  overrideDateStr?: string,
  force = false,
  reminderType: '10am' | '12pm' | 'auto' = 'auto'
) {
  const { dateStr, dayOfWeek, hours, isAfter10AM, isAfter12PM } = getISTDateInfo();
  const targetDate = overrideDateStr || dateStr;

  // Monday to Friday check (1 = Mon, 5 = Fri, 0 = Sun, 6 = Sat)
  if (!force && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return { processed: 0, message: "Weekend in IST — skipping attendance reminder." };
  }

  // Determine effective reminder type: 10am vs 12pm
  let effectiveType: '10am' | '12pm' = '10am';
  if (reminderType === 'auto') {
    if (hours >= 12) {
      effectiveType = '12pm';
    } else {
      effectiveType = '10am';
    }
  } else {
    effectiveType = reminderType;
  }

  // Verify time boundaries unless forced or overridden
  if (!overrideDateStr && !force) {
    if (effectiveType === '10am' && !isAfter10AM) {
      return { processed: 0, message: "Before 10:00 AM IST — reminder skipped." };
    }
    if (effectiveType === '12pm' && !isAfter12PM) {
      return { processed: 0, message: "Before 12:00 PM IST — reminder skipped." };
    }
  }

  const ALL_FOUNDERS: FounderName[] = ["Sourabh", "Asher", "Subin"];

  // Query existing check-ins for targetDate
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

  // Exact titles and bodies per specification
  const title = effectiveType === '10am' ? "Good morning 👋" : "Final check-in reminder";
  const body =
    effectiveType === '10am'
      ? "Don't forget to check in at AutoBee."
      : "You haven't checked in yet. You can check in while you're within 150m of AutoBee HQ.";

  for (const founder of missingFounders) {
    const eventId = `attendance-reminder-${effectiveType}-${founder}-${targetDate}`;

    // Check if notification already exists for today (idempotency)
    const notif = await createNotification({
      eventId,
      title,
      body,
      recipient: founder,
      actor: "System",
      type: "check_in_reminder", // BUG-4 fix: was incorrectly 'check_in'
    });

    if (notif) {
      count++;
      // Trigger native push notification
      await notifyAttendanceChange("check_in_reminder", founder, undefined, {
        title,
        body,
        toUsers: [founder],
      });
    }
  }

  return {
    processed: count,
    type: effectiveType,
    missingFounders,
    message: `${title} sent to ${count} founder(s).`,
  };
}

// 3:00 PM IST Auto-Leave Process (Preserved for legacy cron routes)
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
          check_out_source: "auto_leave", // BUG-6 fix
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

        // Log activity — correct entityType (BUG-7 fix)
        await logActivity({
          type: "created",
          entityId: data.id,
          entityType: "workday" as any,
          description: `${founder} was marked Leave (no check-in by 3:00 PM).`,
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


