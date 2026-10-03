import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      title,
      body: content,
      recipient, // 'All' | 'Sourabh' | 'Asher'
      actor,
      type = 'system',
      entityId,
      entityType,
      priority = 'normal',
    } = body

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing title or body in notification payload' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      return NextResponse.json(
        { success: false, error: 'Supabase URL not configured' },
        { status: 500 }
      )
    }

    // Determine target users
    const ALL_FOUNDERS = ['Sourabh', 'Asher']
    let toUsers: string[] = []

    if (!recipient || recipient === 'All' || recipient === 'all') {
      toUsers = actor ? ALL_FOUNDERS.filter((f) => f !== actor) : ALL_FOUNDERS
      if (toUsers.length === 0) toUsers = ALL_FOUNDERS
    } else {
      toUsers = Array.isArray(recipient) ? recipient : [recipient]
    }

    // Determine appropriate Edge Function endpoint based on notification type
    let endpoint = `${supabaseUrl}/functions/v1/notify-task`
    let payload: any = {
      type: 'created',
      task: {
        id: entityId || `task-${Date.now()}`,
        title: content || title,
        assignee: recipient === 'All' ? undefined : recipient,
        priority: priority || 'normal',
      },
    }

    if (type === 'meeting' || type === 'meeting_alert' || type === 'meeting_change') {
      endpoint = `${supabaseUrl}/functions/v1/notify-meeting`
      payload = {
        type: type === 'meeting_alert' ? 'reminder' : 'updated',
        meeting: {
          id: entityId || `meet-${Date.now()}`,
          title: content || title,
          attendees: toUsers,
          scheduled_at: new Date().toISOString(),
        },
      }
    }

    const edgeRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!edgeRes.ok) {
      const errorText = await edgeRes.text()
      console.warn('Edge function response error:', edgeRes.status, errorText)
      return NextResponse.json(
        { success: false, status: edgeRes.status, error: errorText },
        { status: edgeRes.status }
      )
    }

    const data = await edgeRes.json().catch(() => ({}))
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in /api/notifications/send:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
