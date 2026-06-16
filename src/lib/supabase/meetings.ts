import { supabase } from "../supabase";
import type { Meeting } from "../types";

export function mapMeetingFromDb(dbMeeting: any): Meeting {
  return {
    id: dbMeeting.id,
    title: dbMeeting.title,
    description: dbMeeting.description || undefined,
    scheduledAt: dbMeeting.scheduled_at,
    durationMinutes: dbMeeting.duration_minutes || 30,
    location: dbMeeting.location || undefined,
    meetingLink: dbMeeting.meeting_link || undefined,
    attendees: dbMeeting.attendees || [],
    status: dbMeeting.status || "upcoming",
    notes: dbMeeting.notes || undefined,
    createdBy: dbMeeting.created_by,
    createdAt: dbMeeting.created_at,
    updatedAt: dbMeeting.updated_at,
  };
}

export function mapMeetingToDb(meeting: Partial<Meeting>): any {
  const dbMeeting: any = {};
  if (meeting.title !== undefined) dbMeeting.title = meeting.title;
  if (meeting.description !== undefined) dbMeeting.description = meeting.description || null;
  if (meeting.scheduledAt !== undefined) dbMeeting.scheduled_at = meeting.scheduledAt;
  if (meeting.durationMinutes !== undefined) dbMeeting.duration_minutes = meeting.durationMinutes;
  if (meeting.location !== undefined) dbMeeting.location = meeting.location || null;
  if (meeting.meetingLink !== undefined) dbMeeting.meeting_link = meeting.meetingLink || null;
  if (meeting.attendees !== undefined) dbMeeting.attendees = meeting.attendees;
  if (meeting.status !== undefined) dbMeeting.status = meeting.status;
  if (meeting.notes !== undefined) dbMeeting.notes = meeting.notes || null;
  if (meeting.createdBy !== undefined) dbMeeting.created_by = meeting.createdBy;
  return dbMeeting;
}

export const getMeetings = async () => {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapMeetingFromDb);
};

// After successful meeting create/update/cancel
export const notifyMeetingChange = async (
  type: 'created' | 'updated' | 'cancelled',
  meeting: any
) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-meeting`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ type, meeting }),
      }
    )
    if (!res.ok) {
      const text = await res.text()
      console.error('Notify meeting function returned error status:', res.status, text)
    } else {
      const data = await res.json()
      console.log('Notify meeting function succeeded:', data)
    }
  } catch (error) {
    console.error('Failed to send meeting notification:', error)
    // Don't throw — notification failure shouldn't break the app
  }
}

export const createMeeting = async (meeting: Omit<Meeting, "id" | "createdAt" | "updatedAt">) => {
  const dbData = mapMeetingToDb(meeting);
  const { data, error } = await supabase
    .from("meetings")
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  await notifyMeetingChange('created', data);
  return mapMeetingFromDb(data);
};

export const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
  const dbData = mapMeetingToDb(updates);
  const { data, error } = await supabase
    .from("meetings")
    .update(dbData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await notifyMeetingChange('updated', data);
  return mapMeetingFromDb(data);
};

export const deleteMeeting = async (id: string) => {
  const { data, error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  if (data) {
    await notifyMeetingChange('cancelled', data);
  }
};

export const subscribeToMeetings = (callback: (meetings: Meeting[]) => void) => {
  const channelId = `meetings-realtime-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, async () => {
      const meetings = await getMeetings();
      callback(meetings);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
};
