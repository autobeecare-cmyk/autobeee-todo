"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Calendar, Video, ChevronRight, Clock, Users } from "lucide-react";
import type { Meeting } from "@/lib/types";

interface UpcomingMeetingsProps {
  meetings: Meeting[];
}

export function UpcomingMeetingsCard({ meetings }: UpcomingMeetingsProps) {
  const upcoming = meetings
    .filter((m) => m.status === "upcoming")
    .slice(0, 3);

  const nextMeeting = upcoming[0];

  return (
    <div className="glass-card-premium p-4 sm:p-5 rounded-2xl space-y-3.5 border border-white/[0.08] shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-400" />
          <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
            UPCOMING COMMITMENTS
          </h3>
        </div>
        <Link
          href="/meetings"
          className="text-xs text-orange-400 font-semibold hover:underline flex items-center gap-0.5"
        >
          Calendar ({meetings.length}) <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-white/[0.07] rounded-xl bg-white/[0.01]">
          No upcoming meetings scheduled.
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Top highlight meeting */}
          {nextMeeting && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/[0.08] to-transparent border border-orange-500/20 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300">
                  NEXT UPCOMING
                </span>
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-400" />
                  {format(new Date(nextMeeting.scheduledAt), "EEE, d MMM · h:mm a")}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-foreground leading-snug truncate">
                    {nextMeeting.title}
                  </p>
                  {nextMeeting.attendees && nextMeeting.attendees.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {nextMeeting.attendees.join(", ")}
                    </p>
                  )}
                </div>

                {nextMeeting.meetingLink && (
                  <a
                    href={nextMeeting.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-colors shrink-0"
                    title="Join meeting"
                  >
                    <Video className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Subsequent meetings list */}
          {upcoming.slice(1).map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] transition-all"
            >
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-foreground/90 truncate">
                  {m.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {format(new Date(m.scheduledAt), "d MMM, h:mm a")}
                  {m.durationMinutes ? ` · ${m.durationMinutes}m` : ""}
                </p>
              </div>
              <Link
                href="/meetings"
                className="text-[11px] text-muted-foreground hover:text-orange-400 transition-colors shrink-0 font-medium"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
