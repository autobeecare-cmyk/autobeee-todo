"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  LogOut,
  Coffee,
  Play,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkdaySwipeActionProps {
  status: "idle" | "working" | "break" | "completed" | "leave";
  isAfter3PM?: boolean;
  submitting?: boolean;
  onCheckIn: () => void;
  onTakeBreak: () => void;
  onResumeWork: () => void;
  onEndWorkday: () => void;
}

export function WorkdaySwipeAction({
  status,
  isAfter3PM = false,
  submitting = false,
  onCheckIn,
  onTakeBreak,
  onResumeWork,
  onEndWorkday,
}: WorkdaySwipeActionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(300);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setTrackWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 1. SWIPE RIGHT TO CHECK IN (IDLE STATE)
  // ─────────────────────────────────────────────────────────────
  const [checkInDragX, setCheckInDragX] = useState(0);
  const [isCheckInDragging, setIsCheckInDragging] = useState(false);
  const [isCheckInSuccess, setIsCheckInSuccess] = useState(false);
  const checkInPointerOrigin = useRef<{ x: number; y: number; id: number } | null>(null);
  const checkInGestureLocked = useRef(false);

  const handleWidth = 42; // compact handle width
  const maxCheckInDrag = Math.max(70, trackWidth - handleWidth - 6);
  const checkInThreshold = maxCheckInDrag * 0.65;
  const checkInProgress = Math.min(1, Math.max(0, checkInDragX / (maxCheckInDrag || 1)));

  const getCheckInLabel = () => {
    if (submitting) return "Verifying HQ...";
    if (isCheckInSuccess) return "Checked In ✓";
    if (checkInProgress >= 0.65) return "Release to check in";
    if (checkInProgress >= 0.35) return "Almost there...";
    return "SWIPE TO CHECK IN";
  };

  const handleCheckInPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (submitting || isAfter3PM || isCheckInSuccess) return;
    checkInPointerOrigin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    checkInGestureLocked.current = false;
    setIsCheckInDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleCheckInPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!checkInPointerOrigin.current || submitting) return;

    const deltaX = e.clientX - checkInPointerOrigin.current.x;
    const deltaY = e.clientY - checkInPointerOrigin.current.y;

    if (!checkInGestureLocked.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        checkInPointerOrigin.current = null;
        setIsCheckInDragging(false);
        setCheckInDragX(0);
        return;
      }
      if (Math.abs(deltaX) > 8) {
        checkInGestureLocked.current = true;
      }
    }

    const rawX = Math.max(0, deltaX);
    const clampedX = Math.min(maxCheckInDrag, rawX);
    setCheckInDragX(clampedX);
  };

  const handleCheckInPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!checkInPointerOrigin.current) return;
    checkInPointerOrigin.current = null;
    setIsCheckInDragging(false);

    if (checkInDragX >= checkInThreshold && !submitting) {
      setCheckInDragX(maxCheckInDrag);
      setIsCheckInSuccess(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(25);
        } catch {}
      }
      onCheckIn();
    } else {
      setCheckInDragX(0);
    }
  };

  useEffect(() => {
    if (!submitting) {
      setIsCheckInSuccess(false);
      setCheckInDragX(0);
    }
  }, [submitting]);

  // ─────────────────────────────────────────────────────────────
  // 2. SWIPE LEFT TO END WORKDAY (WORKING STATE)
  // ─────────────────────────────────────────────────────────────
  const [endDragX, setEndDragX] = useState(0);
  const [isEndDragging, setIsEndDragging] = useState(false);
  const endPointerOrigin = useRef<{ x: number; y: number; id: number } | null>(null);
  const endGestureLocked = useRef(false);

  const maxEndDrag = Math.max(60, (trackWidth / 2) - handleWidth);
  const endThreshold = maxEndDrag * 0.65;
  const endProgress = Math.min(1, Math.max(0, Math.abs(endDragX) / (maxEndDrag || 1)));

  const handleEndPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (submitting) return;
    endPointerOrigin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    endGestureLocked.current = false;
    setIsEndDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleEndPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!endPointerOrigin.current || submitting) return;

    const deltaX = e.clientX - endPointerOrigin.current.x;
    const deltaY = e.clientY - endPointerOrigin.current.y;

    if (!endGestureLocked.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        endPointerOrigin.current = null;
        setIsEndDragging(false);
        setEndDragX(0);
        return;
      }
      if (Math.abs(deltaX) > 8) {
        endGestureLocked.current = true;
      }
    }

    const rawX = Math.min(0, deltaX);
    const clampedX = Math.max(-maxEndDrag, rawX);
    setEndDragX(clampedX);
  };

  const handleEndPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!endPointerOrigin.current) return;
    endPointerOrigin.current = null;
    setIsEndDragging(false);

    if (Math.abs(endDragX) >= endThreshold && !submitting) {
      setEndDragX(-maxEndDrag);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(25);
        } catch {}
      }
      onEndWorkday();
      setTimeout(() => setEndDragX(0), 400);
    } else {
      setEndDragX(0);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: IDLE (READY TO CHECK IN)
  // ─────────────────────────────────────────────────────────────
  if (status === "idle") {
    if (isAfter3PM) {
      return (
        <div className="w-full py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-xs text-muted-foreground font-medium">
            Attendance closed for today (past 3:00 PM IST).
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1.5 select-none">
        {/* Compact Gesture Track */}
        <div
          ref={containerRef}
          onPointerDown={handleCheckInPointerDown}
          onPointerMove={handleCheckInPointerMove}
          onPointerUp={handleCheckInPointerUp}
          onPointerCancel={handleCheckInPointerUp}
          className="relative h-12 rounded-xl swipe-track-idle overflow-hidden flex items-center px-1 touch-pan-y backdrop-blur-md cursor-pointer border border-white/10"
        >
          {/* Progress fill */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#FFC107]/20 via-[#FFC107]/35 to-[#FFC107]/50 transition-[width] duration-75 ease-out rounded-xl"
            style={{ width: `${checkInDragX + handleWidth}px` }}
          />

          {/* Centered Guide Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-10">
            <div
              className={cn(
                "flex items-center gap-1 text-[11px] font-extrabold tracking-wider transition-colors duration-150 uppercase",
                checkInProgress >= 0.65
                  ? "text-emerald-400 font-black"
                  : "text-[#FFC107]/80"
              )}
            >
              <span>{getCheckInLabel()}</span>
              {checkInProgress < 0.65 && !submitting && (
                <ChevronRight className="w-3.5 h-3.5 text-[#FFC107] animate-pulse -mr-1" />
              )}
            </div>
          </div>

          {/* Draggable Handle */}
          <div
            style={{
              transform: `translateX(${checkInDragX}px)`,
              transition: isCheckInDragging ? "none" : "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            className={cn(
              "relative z-10 w-9.5 h-9.5 rounded-lg flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing transition-colors",
              isCheckInSuccess || checkInProgress >= 0.65
                ? "bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.6)]"
                : "bee-gradient text-[#111] shadow-[0_0_12px_rgba(255,193,7,0.4)]"
            )}
          >
            {submitting ? (
              <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : isCheckInSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-black" />
            ) : (
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            )}
          </div>
        </div>

        {/* Small hint + Accessible fallback */}
        <div className="flex items-center justify-between px-0.5 text-[10px] text-muted-foreground">
          <span className="text-muted-foreground/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
            Drag handle right to check in
          </span>

          <button
            type="button"
            onClick={onCheckIn}
            disabled={submitting}
            className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-[#FFC107]/15 border border-white/10 hover:border-[#FFC107]/30 text-[#FFC107] font-semibold text-[10px] transition-all cursor-pointer disabled:opacity-50"
            aria-label="Check in to AutoBee"
          >
            {submitting ? "Checking in..." : "Check In"}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: ON BREAK
  // ─────────────────────────────────────────────────────────────
  if (status === "break") {
    return (
      <div className="space-y-1.5 select-none">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2.5 shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Coffee className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[11px] font-bold text-amber-300 uppercase">On Break</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Timer paused</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onResumeWork}
            className="px-3.5 py-1.5 rounded-lg bee-gradient text-[#111] font-bold text-xs flex items-center gap-1 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Resume</span>
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: ACTIVE WORKDAY (WORKING)
  // ─────────────────────────────────────────────────────────────
  if (status === "working") {
    return (
      <div className="space-y-1.5 select-none">
        {/* Dual-Action Gesture Track (48px height) */}
        <div
          ref={containerRef}
          className="relative h-12 rounded-xl swipe-track-active overflow-hidden flex items-center justify-between px-2 touch-pan-y backdrop-blur-md border border-white/10"
        >
          {/* Left: End Day Drag Area */}
          <div
            onPointerDown={handleEndPointerDown}
            onPointerMove={handleEndPointerMove}
            onPointerUp={handleEndPointerUp}
            onPointerCancel={handleEndPointerUp}
            className="relative flex-1 h-full flex items-center justify-start pl-1 pr-2 cursor-grab active:cursor-grabbing group"
          >
            <div
              className="absolute right-0 top-0 bottom-0 bg-red-500/20 rounded-lg transition-[width] duration-75"
              style={{ width: `${Math.abs(endDragX)}px` }}
            />

            <div className="flex items-center gap-1 z-10 pointer-events-none">
              <div
                style={{
                  transform: `translateX(${endDragX}px)`,
                  transition: isEndDragging ? "none" : "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
                className={cn(
                  "w-7.5 h-7.5 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-sm",
                  endProgress >= 0.65 && "bg-red-500 text-white"
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-bold text-red-400/90 uppercase tracking-tight truncate">
                {endProgress >= 0.65 ? "Release" : "← End"}
              </span>
            </div>
          </div>

          <div className="w-[1px] h-5 bg-white/10 shrink-0" />

          {/* Center: Take Break Button */}
          <button
            type="button"
            onClick={onTakeBreak}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.96] cursor-pointer shrink-0 shadow-sm mx-1"
          >
            <Coffee className="w-3 h-3 text-amber-400" />
            <span>BREAK</span>
          </button>

          <div className="w-[1px] h-5 bg-white/10 shrink-0" />

          {/* Right: Active Live Dot */}
          <div className="flex-1 flex items-center justify-end pr-1 gap-1 text-emerald-400 text-[11px] font-bold shrink-0">
            <span className="text-[10px] uppercase hidden sm:inline">Active</span>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
          </div>
        </div>

        {/* Fallback button cues */}
        <div className="flex items-center justify-between px-0.5 text-[10px]">
          <span className="text-muted-foreground/60">
            Drag left to end or tap actions
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTakeBreak}
              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-amber-500/15 border border-white/10 text-amber-300 font-semibold text-[10px] transition-all cursor-pointer"
            >
              Break
            </button>

            <button
              type="button"
              onClick={onEndWorkday}
              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-red-500/20 border border-white/10 text-red-400 font-semibold text-[10px] transition-all cursor-pointer"
            >
              End Day
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-2 px-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-400">
      <CheckCircle2 className="w-3.5 h-3.5" />
      <span>Workday completed</span>
    </div>
  );
}
