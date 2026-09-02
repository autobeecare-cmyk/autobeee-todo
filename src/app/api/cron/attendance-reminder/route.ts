import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// RACE-3 fix: This route is a thin proxy to the notify-attendance-reminder Edge Function.
// Previously, this route duplicated the entire reminder logic (query workdays, insert notifications,
// send pushes) independently of the Edge Function, creating a race where both could fire simultaneously.
// Now the Edge Function is the single source of truth for attendance reminder logic.
async function proxyToEdgeFunction(params: Record<string, string>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  const query = new URLSearchParams(params).toString()
  const url = `${supabaseUrl}/functions/v1/notify-attendance-reminder${query ? `?${query}` : ''}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Edge function returned ${res.status}`)
  }
  return data
}

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
        { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(req.url)
    const params: Record<string, string> = {}
    if (searchParams.get('force')) params.force = searchParams.get('force')!
    if (searchParams.get('type')) params.type = searchParams.get('type')!
    const result = await proxyToEdgeFunction(params)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Attendance reminder proxy failed:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed attendance reminder process' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }
    const body = await req.json().catch(() => ({}))
    const params: Record<string, string> = {}
    if (body.force) params.force = 'true'
    if (body.type) params.type = body.type
    const result = await proxyToEdgeFunction(params)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Attendance reminder proxy failed:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed attendance reminder process' },
      { status: 500 }
    )
  }
}
