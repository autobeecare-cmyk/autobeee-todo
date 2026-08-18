import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  AUTOBEE_OFFICE_LAT,
  AUTOBEE_OFFICE_LNG,
  AUTOBEE_OFFICE_RADIUS_METERS,
  calculateHaversineDistance,
  getISTDateInfo,
  notifyAttendanceChange,
} from '@/lib/supabase/workday'
import { logActivity } from '@/lib/supabase/activity'
import { createNotification } from '@/lib/supabase/notifications'
import type { FounderName } from '@/lib/types'

export const dynamic = 'force-dynamic'

const VALID_FOUNDERS: FounderName[] = ['Sourabh', 'Asher', 'Subin']

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { founderName, latitude, longitude, accuracy, timestamp } = body

    // 1. Validate founder identity
    if (!founderName || !VALID_FOUNDERS.includes(founderName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing founder name' },
        { status: 400 }
      )
    }

    // 2. Validate coordinates & accuracy
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return NextResponse.json(
        { success: false, error: "Couldn't get your location. Make sure Location is enabled and try again." },
        { status: 400 }
      )
    }

    // 3. Independent Server-Side Time Cutoff Check (3:00 PM IST)
    const { dateStr, isAfter3PM } = getISTDateInfo()
    if (isAfter3PM) {
      return NextResponse.json(
        { success: false, error: 'Check-in is closed for today.' },
        { status: 400 }
      )
    }

    // 4. Location Accuracy Check
    // If accuracy is extremely poor (> 1000m), reject and request precise location
    if (typeof accuracy === 'number' && accuracy > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: "Your location isn't accurate enough. Please enable precise location and try again.",
        },
        { status: 400 }
      )
    }

    // 5. Geodesic Haversine Distance Check (150m Office Radius)
    const distance = calculateHaversineDistance(
      latitude,
      longitude,
      AUTOBEE_OFFICE_LAT,
      AUTOBEE_OFFICE_LNG
    )

    if (distance > AUTOBEE_OFFICE_RADIUS_METERS) {
      return NextResponse.json(
        {
          success: false,
          error: "You're outside the office. Move closer to the office to check in.",
          distanceMeters: Math.round(distance),
        },
        { status: 400 }
      )
    }

    // 6. Check if user already checked in today
    const { data: existing, error: fetchErr } = await supabase
      .from('workdays')
      .select('*')
      .eq('founder_name', founderName)
      .eq('work_date', dateStr)
      .maybeSingle()

    if (fetchErr) {
      console.error('Error querying existing workday:', fetchErr)
    }

    if (existing) {
      if (existing.status === 'leave') {
        return NextResponse.json(
          { success: false, error: 'Today’s attendance is closed.' },
          { status: 400 }
        )
      }
      return NextResponse.json({
        success: true,
        workday: existing,
        message: 'Already checked in today.',
      })
    }

    // 7. Create attendance record in database using valid schema columns only
    const nowIso = new Date().toISOString()

    const { data: newWorkday, error: insertErr } = await supabase
      .from('workdays')
      .insert({
        founder_name: founderName,
        work_date: dateStr,
        check_in_at: nowIso,
        status: 'working',
      })
      .select()
      .single()

    if (insertErr) {
      // If concurrent request created a record, fetch the existing one
      if (insertErr.code === '23505') {
        const { data: retry } = await supabase
          .from('workdays')
          .select('*')
          .eq('founder_name', founderName)
          .eq('work_date', dateStr)
          .single()
        if (retry) {
          return NextResponse.json({ success: true, workday: retry })
        }
      }
      console.error('Supabase check-in insert error:', {
        code: insertErr.code,
        message: insertErr.message,
        details: insertErr.details,
        hint: insertErr.hint,
        table: 'workdays',
        payload: {
          founder_name: founderName,
          work_date: dateStr,
          check_in_at: nowIso,
          status: 'working',
        },
      })
      return NextResponse.json(
        { success: false, error: "Couldn't check you in. Please try again." },
        { status: 500 }
      )
    }

    // 8. Log workday event audit trail
    await supabase.from('workday_events').insert({
      workday_id: newWorkday.id,
      founder_name: founderName,
      event_type: 'check_in',
      timestamp: nowIso,
      metadata: {
        source: 'location',
        distanceMeters: Math.round(distance),
        accuracy: typeof accuracy === 'number' ? accuracy : null,
      },
    })

    // 9. Log company activity
    await logActivity({
      type: 'created',
      entityId: newWorkday.id,
      entityType: 'task',
      description: `${founderName} checked in at the office.`,
    })

    // 10. Create in-app notification (idempotent via eventId)
    await createNotification({
      eventId: `workday_checkin_${newWorkday.id}`,
      title: 'Office Check-in',
      body: `${founderName} arrived at the office.`,
      recipient: 'All',
      actor: founderName,
      type: 'check_in',
    })

    // 11. Dispatch FCM push notification to other team members
    await notifyAttendanceChange('check_in', founderName, newWorkday)

    return NextResponse.json({
      success: true,
      workday: newWorkday,
      distanceMeters: Math.round(distance),
    })
  } catch (error: any) {
    console.error('Server check-in error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
