import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendPushNotification } from '../_shared/send-notification.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY') || ''

    const { type, meeting } = await req.json()
    // type: 'created' | 'updated' | 'cancelled' | 'reminder'

    let title = ''
    let body = ''

    const time = new Date(meeting.scheduled_at).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    })

    const date = new Date(meeting.scheduled_at).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    })

    switch (type) {
      case 'created':
        title = '📅 New Meeting Scheduled'
        body = `${meeting.title} — ${date} at ${time}`
        break
      case 'updated':
        title = '📅 Meeting Updated'
        body = `${meeting.title} has been rescheduled to ${date} at ${time}`
        break
      case 'cancelled':
        title = '❌ Meeting Cancelled'
        body = `${meeting.title} on ${date} has been cancelled`
        break
      case 'reminder':
        title = '⏰ Meeting in 15 minutes'
        body = `${meeting.title} starts at ${time}`
        break
    }

    // Send to all attendees
    const attendees = meeting.attendees?.length > 0 ? meeting.attendees : ['All']

    const result = await sendPushNotification({
      toUsers: attendees,
      title,
      body,
      type: type === 'reminder' ? 'meeting_alert' : 'meeting_change',
      entityId: meeting.id,
      entityType: 'meeting',
      priority: type === 'reminder' ? 'high' : 'normal',
      supabaseUrl,
      supabaseKey,
      fcmServerKey,
    })

    return new Response(JSON.stringify({ success: true, details: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Error in notify-meeting handler:', err)
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
