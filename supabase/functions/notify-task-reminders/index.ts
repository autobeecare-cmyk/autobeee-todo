// This runs on a CRON schedule every day at 9:00 AM IST (3:30 AM UTC)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { sendPushNotification } from '../_shared/send-notification.ts'

serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')!

  // Use Asia/Kolkata timezone for date comparison
  const istDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

  // Get tasks due today or overdue
  const tasksRes = await fetch(
    `${supabaseUrl}/rest/v1/tasks?status=neq.done&select=*`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  )

  const allTasks = await tasksRes.json()

  if (!allTasks || allTasks.length === 0) {
    return new Response(JSON.stringify({ message: 'No active tasks found' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Filter tasks with deadlines
  const tasksWithDeadline = allTasks.filter((t: any) => t.deadline)
  const overdue: any[] = []
  const dueToday: any[] = []

  for (const t of tasksWithDeadline) {
    const taskDateStr = t.deadline.split('T')[0]
    if (taskDateStr === istDateStr) {
      dueToday.push(t)
    } else if (taskDateStr < istDateStr) {
      overdue.push(t)
    }
  }

  const ALL_FOUNDERS = ['Sourabh', 'Asher', 'Subin']
  let sentCount = 0

  // Helper to send task reminder to a specific founder
  const notifyFounder = async (
    founder: string,
    tasksList: any[],
    typePrefix: 'due' | 'overdue',
    title: string
  ) => {
    if (tasksList.length === 0) return
    const eventId = `task_reminder_${typePrefix}_${founder}_${istDateStr}`

    // Check if in-app notification already exists for today
    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/notifications?event_id=eq.${eventId}&select=id`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      }
    )
    const existing = await checkRes.json()
    if (existing && existing.length > 0) return

    const bodyText =
      tasksList.slice(0, 2).map((t: any) => t.title).join(', ') +
      (tasksList.length > 2 ? ` +${tasksList.length - 2} more` : '')

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
        body: bodyText,
        recipient: founder,
        actor: 'System',
        type: 'task_reminder',
        read: false,
      }),
    })

    // Send push notification
    await sendPushNotification({
      toUsers: [founder],
      title,
      body: bodyText,
      type: 'task_reminder',
      entityType: 'task',
      priority: typePrefix === 'overdue' ? 'high' : 'normal',
      supabaseUrl,
      supabaseKey,
      fcmServerKey,
    })

    sentCount++
  }

  // Group notifications per founder
  for (const founder of ALL_FOUNDERS) {
    const myOverdue = overdue.filter(
      (t) => t.assignee === founder || t.assignee === 'All' || !t.assignee
    )
    const myDueToday = dueToday.filter(
      (t) => t.assignee === founder || t.assignee === 'All' || !t.assignee
    )

    if (myOverdue.length > 0) {
      await notifyFounder(
        founder,
        myOverdue,
        'overdue',
        `⚠️ ${myOverdue.length} Overdue Task${myOverdue.length > 1 ? 's' : ''}`
      )
    }

    if (myDueToday.length > 0) {
      await notifyFounder(
        founder,
        myDueToday,
        'due',
        `📋 ${myDueToday.length} Task${myDueToday.length > 1 ? 's' : ''} Due Today`
      )
    }
  }

  return new Response(JSON.stringify({ success: true, date: istDateStr, sentCount }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
