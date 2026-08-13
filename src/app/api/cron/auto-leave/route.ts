import { NextResponse } from "next/server";
import { processAutoLeaveServer } from "@/lib/supabase/workday";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const overrideDate = searchParams.get("date") || undefined;
    const result = await processAutoLeaveServer(overrideDate);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Auto-leave execution failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed auto-leave process" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const overrideDate = body.date || undefined;
    const result = await processAutoLeaveServer(overrideDate);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Auto-leave execution failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed auto-leave process" },
      { status: 500 }
    );
  }
}
