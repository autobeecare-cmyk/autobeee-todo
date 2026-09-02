import { NextResponse } from "next/server";
import { processAutoLeaveServer } from "@/lib/supabase/workday";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const secretHeader = req.headers.get("x-cron-secret");
    const url = new URL(req.url);
    const secretQuery = url.searchParams.get("secret");

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : secretHeader || secretQuery;

    return token === cronSecret;
  }
  return true;
}

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing CRON_SECRET" },
        { status: 401 }
      );
    }
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
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing CRON_SECRET" },
        { status: 401 }
      );
    }
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
