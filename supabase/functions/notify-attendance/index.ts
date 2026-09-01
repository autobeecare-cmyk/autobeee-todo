import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendPushNotification } from '../_shared/send-notification.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      type, // 'check_in' | 'check_out' | 'auto_check_out' | 'check_in_reminder' | 'auto_leave' | 'test'
      founderName,
      title: customTitle,
      body: customBody,
      toUsers: customToUsers,
      workday,
    } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY') || ''

    const ALL_FOUNDERS = ['Sourabh', 'Asher', 'Subin']
    let title = customTitle || ''
    let body = customBody || ''
    let toUsers: string[] = customToUsers || []
    let priority: 'high' | 'normal' = 'normal'

    switch (type) {
      case 'check_in': {
        title = customTitle || 'Office Check-in'
        body = customBody || `${founderName || 'A team member'} checked in.`
        // Send to everyone else in the team
        toUsers = customToUsers || ALL_FOUNDERS.filter((f) => f !== founderName)
        priority = 'high'
        break
      }
      case 'check_out': {
        title = customTitle || 'Office Check-out'
        body = customBody || `${founderName || 'A team member'} ended their workday.`
        // Send to everyone else in the team
        toUsers = customToUsers || ALL_FOUNDERS.filter((f) => f !== founderName)
        priority = 'normal'
        break
      }
      case 'auto_check_out': {
        title = 'Automatic Check-out'
        body = 'You were automatically checked out at 7:00 PM.'
        toUsers = customToUsers || (founderName ? [founderName] : ALL_FOUNDERS)
        priority = 'high'
        break
      }
      case 'check_in_reminder': {
        title = 'Office Check-in Reminder'
        body = "You haven't checked in today."
        toUsers = customToUsers || (founderName ? [founderName] : ALL_FOUNDERS)
        priority = 'high'
        break
      }
      case 'auto_leave': {
        title = 'AutoBee OS Attendance'
        body = `${founderName} was marked Leave today (no check-in before 3:00 PM).`
        toUsers = ALL_FOUNDERS
        priority = 'normal'
        break
      }
      case 'test': {
        title = customTitle || 'AutoBee Test Notification'
        body = customBody || 'Native push notifications are working perfectly!'
        toUsers = customToUsers || (founderName ? [founderName] : ALL_FOUNDERS)
        priority = 'high'
        break
      }
      default: {
        title = customTitle || 'Office Attendance Update'
        body = customBody || `${founderName || 'Team member'} attendance updated.`
        toUsers = customToUsers || ALL_FOUNDERS
      }
    }

    const result = await sendPushNotification({
      toUsers,
      title,
      body,
      type: type || 'attendance',
      entityId: workday?.id,
      entityType: 'workday',
      priority,
      supabaseUrl,
      supabaseKey,
      fcmServerKey,
    })

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Error in notify-attendance handler:', err)
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
