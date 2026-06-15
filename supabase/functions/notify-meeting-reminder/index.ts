// Runs every 5 minutes via cron — checks for meetings starting in 15 min
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendPushNotification } from '../_shared/send-notification.ts'

serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')!

  // Find meetings starting between now+10min and now+20min
  const now = new Date()
  const windowStart = new Date(now.getTime() + 10 * 60000).toISOString()
  const windowEnd = new Date(now.getTime() + 20 * 60000).toISOString()

  const meetingsRes = await fetch(
    `${supabaseUrl}/rest/v1/meetings?scheduled_at=gte.${windowStart}&scheduled_at=lte.${windowEnd}&status=eq.upcoming&select=*`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  )

  const meetings = await meetingsRes.json()

  for (const meeting of meetings ?? []) {
    const attendees = meeting.attendees?.length > 0 ? meeting.attendees : ['Sourabh', 'Asher', 'Subin']
    const time = new Date(meeting.scheduled_at).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
    })

    await sendPushNotification({
      toUsers: attendees,
      title: '⏰ Meeting in 15 minutes',
      body: `${meeting.title} starts at ${time}`,
      type: 'meeting_alert',
      entityId: meeting.id,
      entityType: 'meeting',
      supabaseUrl,
      supabaseKey,
      fcmServerKey,
    })
  }

  return new Response(JSON.stringify({ checked: meetings?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
