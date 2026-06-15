// This runs on a CRON schedule every day at 9:00 AM IST (3:30 AM UTC)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendPushNotification } from '../_shared/send-notification.ts'

serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')!

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0]

  // Get tasks due today or overdue
  const tasksRes = await fetch(
    `${supabaseUrl}/rest/v1/tasks?deadline=lte.${tomorrowStr}T23:59:59Z&status=neq.done&select=*`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  )

  const tasks = await tasksRes.json()

  if (!tasks || tasks.length === 0) {
    return new Response(JSON.stringify({ message: 'No tasks due' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Group: overdue vs due today
  const overdue = tasks.filter((t: any) => new Date(t.deadline) < today)
  const dueToday = tasks.filter((t: any) => {
    const d = new Date(t.deadline).toISOString().split('T')[0]
    return d === todayStr
  })

  // Send overdue notification
  if (overdue.length > 0) {
    const assignees = [...new Set(overdue.map((t: any) => t.assignee).filter(Boolean))] as string[]
    const targets = assignees.includes('All') ? ['Sourabh', 'Asher', 'Subin'] : assignees

    await sendPushNotification({
      toUsers: targets.length > 0 ? targets : ['Sourabh', 'Asher', 'Subin'],
      title: `⚠️ ${overdue.length} Overdue Task${overdue.length > 1 ? 's' : ''}`,
      body: overdue.slice(0, 2).map((t: any) => t.title).join(', ') + (overdue.length > 2 ? ` +${overdue.length - 2} more` : ''),
      type: 'task_reminder',
      entityType: 'task',
      supabaseUrl,
      supabaseKey,
      fcmServerKey,
    })
  }

  // Send due-today notification
  if (dueToday.length > 0) {
    await sendPushNotification({
      toUsers: ['Sourabh', 'Asher', 'Subin'],
      title: `📋 ${dueToday.length} Task${dueToday.length > 1 ? 's' : ''} Due Today`,
      body: dueToday.slice(0, 2).map((t: any) => t.title).join(', ') + (dueToday.length > 2 ? ` +${dueToday.length - 2} more` : ''),
      type: 'task_reminder',
      entityType: 'task',
      supabaseUrl,
      supabaseKey,
      fcmServerKey,
    })
  }

  return new Response(JSON.stringify({ sent: tasks.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
