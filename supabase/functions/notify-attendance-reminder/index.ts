// Runs on a CRON schedule Mon–Fri at 10:00 AM IST (4:30 AM UTC: 30 4 * * 1-5) and 12:00 PM IST (6:30 AM UTC: 30 6 * * 1-5)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendPushNotification } from '../_shared/send-notification.ts'

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY') || ''

  // Timezone-aware IST calculation
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + istOffset)

  const year = istDate.getFullYear()
  const month = String(istDate.getMonth() + 1).padStart(2, '0')
  const day = String(istDate.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  const dayOfWeek = istDate.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const hours = istDate.getHours()

  // Parse optional URL parameters
  const url = new URL(req.url)
  const force = url.searchParams.get('force') === 'true'
  const explicitType = url.searchParams.get('type') // '10am' | '12pm'

  // Check if weekend (Saturday or Sunday in IST)
  if (!force && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return new Response(
      JSON.stringify({ message: 'Weekend in IST — skipping attendance reminder', dateStr }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  const reminderType: '10am' | '12pm' =
    explicitType === '10am' || explicitType === '12pm'
      ? explicitType
      : hours >= 12
      ? '12pm'
      : '10am'

  const title = reminderType === '10am' ? 'Office Check-in' : 'Final Office Check-in Reminder'
  const body =
    reminderType === '10am'
      ? "You haven't checked in today."
      : "You haven't checked in today. This is your final reminder."

  const ALL_FOUNDERS = ['Sourabh', 'Asher', 'Subin']

  // 1. Fetch today's workdays
  const workdaysRes = await fetch(
    `${supabaseUrl}/rest/v1/workdays?work_date=eq.${dateStr}&select=founder_name,status`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  )

  const workdays = await workdaysRes.json()
  const checkedInFounders = new Set(
    (workdays || [])
      .filter((w: any) => w.status === 'working' || w.status === 'completed')
      .map((w: any) => w.founder_name)
  )

  const missingFounders = ALL_FOUNDERS.filter((f) => !checkedInFounders.has(f))

  if (missingFounders.length === 0) {
    return new Response(
      JSON.stringify({ message: 'All founders already checked in today', dateStr, reminderType }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  const notifiedFounders: string[] = []

  for (const founder of missingFounders) {
    const eventId = `attendance-reminder-${reminderType}-${founder}-${dateStr}`

    // Check idempotency in notifications table
    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/notifications?event_id=eq.${eventId}&select=id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    const existing = await checkRes.json()
    if (existing && existing.length > 0) {
      console.log(`Reminder (${reminderType}) already sent for ${founder} on ${dateStr}, skipping.`)
      continue
    }

    // Insert in-app notification
    await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_id: eventId,
        title,
        body,
        recipient: founder,
        actor: 'System',
        type: 'check_in_reminder',
        read: false,
      }),
    })

    // Send native push notification
    await sendPushNotification({
      toUsers: [founder],
      title,
      body,
      type: 'check_in_reminder',
      entityId: eventId,
      entityType: 'attendance',
      priority: 'high',
      supabaseUrl,
      supabaseKey,
      fcmServerKey,
    })

    notifiedFounders.push(founder)
  }

  return new Response(
    JSON.stringify({
      success: true,
      dateStr,
      reminderType,
      title,
      missingFounders,
      notifiedFounders,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

