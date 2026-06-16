// Instant task notification — called when tasks are created, assigned, or completed
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendPushNotification } from '../_shared/send-notification.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, task } = await req.json()
    // type: 'created' | 'assigned' | 'completed' | 'updated' | 'deadline_approaching'

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')!

    let title = ''
    let body = ''
    const allUsers = ['Sourabh', 'Asher', 'Subin']

    // Determine who to notify
    const assignee = task.assignee || 'All'
    const toUsers = assignee === 'All' ? allUsers : allUsers // notify everyone for team visibility

    switch (type) {
      case 'created':
        title = '📋 New Task Created'
        body = `${task.title}${task.assignee ? ` — assigned to ${task.assignee}` : ''}`
        break
      case 'assigned':
        title = '👤 Task Assigned to You'
        body = `${task.title}${task.deadline ? ` — due ${new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}`
        break
      case 'completed':
        title = '✅ Task Completed'
        body = task.title
        break
      case 'updated':
        title = '📝 Task Updated'
        body = task.title
        break
      default:
        title = '📋 Task Update'
        body = task.title
    }

    const result = await sendPushNotification({
      toUsers,
      title,
      body,
      type: 'task_reminder',
      entityId: task.id,
      entityType: 'task',
      supabaseUrl,
      supabaseKey,
      fcmServerKey,
    })

    return new Response(JSON.stringify({ success: true, details: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Error in notify-task handler:', err)
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
