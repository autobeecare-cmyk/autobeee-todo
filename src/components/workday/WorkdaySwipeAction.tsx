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
  const [trackWidth, setTrackWidth] = useState(320);

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

  const handleWidth = 44;
  const maxCheckInDrag = Math.max(80, trackWidth - handleWidth - 8);
  const checkInThreshold = maxCheckInDrag * 0.65;
  const checkInProgress = Math.min(1, Math.max(0, checkInDragX / (maxCheckInDrag || 1)));

  const getCheckInLabel = () => {
    if (submitting) return "Verifying HQ (150m)...";
    if (isCheckInSuccess) return "Checked In ✓";
    if (checkInProgress >= 0.65) return "Release to Check In";
    if (checkInProgress >= 0.3) return "Keep dragging...";
    return "SWIPE TO START WORKDAY";
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

    // Apply gentle resistance curve
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
  // 2. SWIPE TO END WORKDAY (WORKING STATE)
  // ─────────────────────────────────────────────────────────────
  const [endDragX, setEndDragX] = useState(0);
  const [isEndDragging, setIsEndDragging] = useState(false);
  const endPointerOrigin = useRef<{ x: number; y: number; id: number } | null>(null);
  const endGestureLocked = useRef(false);

  const maxEndDrag = Math.max(70, trackWidth * 0.5 - handleWidth);
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

    // Drag left toward negative X
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
        <div className="w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-xs text-muted-foreground font-medium">
            Attendance closed for today (past 3:00 PM IST).
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2 select-none">
        {/* Interactive Swipe Track */}
        <div
          ref={containerRef}
          onPointerDown={handleCheckInPointerDown}
          onPointerMove={handleCheckInPointerMove}
          onPointerUp={handleCheckInPointerUp}
          onPointerCancel={handleCheckInPointerUp}
          className="relative h-13 rounded-xl overflow-hidden flex items-center px-1.5 touch-pan-y backdrop-blur-xl cursor-pointer border border-white/10 shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 193, 7, 0.08) 0%, rgba(20, 20, 20, 0.6) 100%)",
          }}
        >
          {/* Dynamic Progress Fill with Gold Gradient */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#FFC107]/20 via-[#FFC107]/35 to-[#FFC107]/55 transition-[width] duration-75 ease-out rounded-xl"
            style={{ width: `${checkInDragX + handleWidth}px` }}
          />

          {/* Centered Guide Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
            <div
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-black tracking-wider uppercase transition-colors duration-150",
                checkInProgress >= 0.65
                  ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                  : "text-[#FFC107]/90"
              )}
            >
              <span>{getCheckInLabel()}</span>
              {checkInProgress < 0.65 && !submitting && (
                <ChevronRight className="w-4 h-4 text-[#FFC107] animate-pulse -mr-1" />
              )}
            </div>
          </div>

          {/* Draggable Handle */}
          <div
            style={{
              transform: `translateX(${checkInDragX}px)`,
              transition: isCheckInDragging
                ? "none"
                : "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            className={cn(
              "relative z-10 w-10 h-10 rounded-lg flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing transition-all",
              isCheckInSuccess || checkInProgress >= 0.65
                ? "bg-emerald-400 text-black shadow-[0_0_16px_rgba(52,211,153,0.6)]"
                : "bee-gradient text-[#111] shadow-[0_0_12px_rgba(255,193,7,0.4)] hover:scale-105"
            )}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : isCheckInSuccess ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-black" />
            ) : (
              <ArrowRight className="w-4.5 h-4.5 stroke-[2.5]" />
            )}
          </div>
        </div>

        {/* Small hint + Accessible fallback button */}
        <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
          <span className="text-muted-foreground/60 flex items-center gap-1 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
            Swipe handle right or tap to check in
          </span>

          <button
            type="button"
            onClick={onCheckIn}
            disabled={submitting}
            className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-[#FFC107]/15 border border-white/10 hover:border-[#FFC107]/30 text-[#FFC107] font-bold text-[10px] transition-all cursor-pointer disabled:opacity-50"
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
      <div className="space-y-2 select-none">
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
              <Coffee className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-black text-amber-300 uppercase tracking-tight">
                  On Break
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Work timer is safely paused
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEndWorkday}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-muted-foreground hover:text-red-400 text-xs font-semibold transition-all cursor-pointer"
            >
              End Day
            </button>

            <button
              type="button"
              onClick={onResumeWork}
              className="px-4 py-1.5 rounded-xl bee-gradient text-[#111] font-bold text-xs flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Work</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: ACTIVE WORKDAY (WORKING)
  // ─────────────────────────────────────────────────────────────
  if (status === "working") {
    return (
      <div className="space-y-2 select-none">
        {/* Dual-Action Console Track */}
        <div
          ref={containerRef}
          className="relative h-13 rounded-xl overflow-hidden flex items-center justify-between px-2 touch-pan-y backdrop-blur-xl border border-white/10 shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(20, 20, 20, 0.6) 100%)",
          }}
        >
          {/* Left: Interactive Swipe-Left to End Day */}
          <div
            onPointerDown={handleEndPointerDown}
            onPointerMove={handleEndPointerMove}
            onPointerUp={handleEndPointerUp}
            onPointerCancel={handleEndPointerUp}
            className="relative flex-1 h-full flex items-center justify-start pl-1 pr-2 cursor-grab active:cursor-grabbing group"
          >
            <div
              className="absolute right-0 top-0 bottom-0 bg-red-500/25 rounded-lg transition-[width] duration-75"
              style={{ width: `${Math.abs(endDragX)}px` }}
            />

            <div className="flex items-center gap-1.5 z-10 pointer-events-none">
              <div
                style={{
                  transform: `translateX(${endDragX}px)`,
                  transition: isEndDragging
                    ? "none"
                    : "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
                className={cn(
                  "w-8.5 h-8.5 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-sm transition-colors",
                  endProgress >= 0.65 && "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                )}
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-bold text-red-400/90 uppercase tracking-tight truncate">
                {endProgress >= 0.65 ? "Release to End" : "← Drag to End"}
              </span>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-white/10 shrink-0 mx-1" />

          {/* Right: Tactile Take Break Action */}
          <button
            type="button"
            onClick={onTakeBreak}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.96] cursor-pointer shrink-0 shadow-sm"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>TAKE BREAK</span>
          </button>
        </div>

        {/* Fallback Accessible Action Strip */}
        <div className="flex items-center justify-between px-1 text-[10px]">
          <span className="text-muted-foreground/60">
            Drag left or use quick actions
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTakeBreak}
              className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-amber-500/15 border border-white/10 text-amber-300 font-semibold text-[10px] transition-all cursor-pointer"
            >
              Break
            </button>

            <button
              type="button"
              onClick={onEndWorkday}
              className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-red-500/20 border border-white/10 text-red-400 font-semibold text-[10px] transition-all cursor-pointer"
            >
              End Day
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-2.5 px-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-400">
      <CheckCircle2 className="w-3.5 h-3.5" />
      <span>Workday completed</span>
    </div>
  );
}
