import { NextResponse } from 'next/server'
import { processAttendanceReminderServer } from '@/lib/supabase/workday'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const overrideDate = searchParams.get('date') || undefined
    const force = searchParams.get('force') === 'true'
    const reminderType = (searchParams.get('type') || 'auto') as '10am' | '12pm' | 'auto'
    const result = await processAttendanceReminderServer(overrideDate, force, reminderType)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Attendance reminder execution failed:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed attendance reminder process' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const overrideDate = body.date || undefined
    const force = body.force === true
    const reminderType = (body.type || 'auto') as '10am' | '12pm' | 'auto'
    const result = await processAttendanceReminderServer(overrideDate, force, reminderType)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Attendance reminder execution failed:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed attendance reminder process' },
      { status: 500 }
    )
  }
}

