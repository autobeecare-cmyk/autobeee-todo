// Runs on a CRON schedule daily at 7:00 PM IST (1:30 PM UTC: 30 13 * * *)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendPushNotification } from '../_shared/send-notification.ts'

serve(async (_req) => {
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

  // 1. Fetch active workdays for today where status is 'working' and checkout is not yet done
  const workdaysRes = await fetch(
    `${supabaseUrl}/rest/v1/workdays?work_date=eq.${dateStr}&status=eq.working&select=*`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  )

  const activeWorkdays = await workdaysRes.json()

  if (!activeWorkdays || activeWorkdays.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No active office sessions to auto-checkout', dateStr, processed: 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  const processedList: any[] = []
  const nowIso = new Date().toISOString()

  for (const workday of activeWorkdays) {
    const eventId = `workday_autocheckout_${workday.id}`

    // 2. Update workday record to completed
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/workdays?id=eq.${workday.id}`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        check_out_at: nowIso,
        status: 'completed',
        updated_at: nowIso,
      }),
    })

    if (!updateRes.ok) {
      console.error(`Failed to update workday ${workday.id}:`, await updateRes.text())
      continue
    }

    // 3. Insert workday event audit trail
    await fetch(`${supabaseUrl}/rest/v1/workday_events`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workday_id: workday.id,
        founder_name: workday.founder_name,
        event_type: 'auto_check_out',
        timestamp: nowIso,
        metadata: { source: 'automatic', reason: '7_pm_deadline' },
      }),
    })

    // 4. Insert in-app notification (idempotent via event_id)
    await fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_id: eventId,
        title: 'Automatic Check-out',
        body: 'You were automatically checked out at 7:00 PM.',
        recipient: workday.founder_name,
        actor: 'System',
        type: 'auto_check_out',
        read: false,
      }),
    })

    // 5. Send native push notification
    await sendPushNotification({
      toUsers: [workday.founder_name],
      title: 'Automatic Check-out',
      body: 'You were automatically checked out at 7:00 PM.',
      type: 'auto_check_out',
      entityId: workday.id,
      entityType: 'workday',
      priority: 'high',
      supabaseUrl,
      supabaseKey,
      fcmServerKey,
    })

    processedList.push({ id: workday.id, founder: workday.founder_name })
  }

  return new Response(
    JSON.stringify({
      success: true,
      dateStr,
      processed: processedList.length,
      details: processedList,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
