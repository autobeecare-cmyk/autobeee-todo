// Shared helper: send FCM push notifications to a list of target user names
// Compatible with Deno / Supabase Edge Functions environment

function getDeepLinkUrl(type: string): string {
  switch (type) {
    case 'check_in':
    case 'check_out':
    case 'auto_leave':
    case 'auto_check_out':
    case 'check_in_reminder':
    case 'attendance':
      return '/'
    case 'task':
    case 'task_reminder':
      return '/tasks'
    case 'meeting':
    case 'meeting_alert':
    case 'meeting_change':
      return '/meetings'
    case 'goal':
    case 'goal_reminder':
      return '/goals'
    case 'settlement':
    case 'expense':
      return '/money'
    case 'partner_update':
      return '/partners'
    default:
      return '/'
  }
}

async function getAccessToken(credentials: {
  client_email: string
  private_key: string
}): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claimSet = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const textEncoder = new TextEncoder()

  const base64UrlEncode = (u8: Uint8Array) => {
    let bin = ''
    for (let i = 0; i < u8.length; i++) {
      bin += String.fromCharCode(u8[i])
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const encodedHeader = base64UrlEncode(textEncoder.encode(JSON.stringify(header)))
  const encodedClaimSet = base64UrlEncode(textEncoder.encode(JSON.stringify(claimSet)))
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`

  // Robust private key PEM cleanup
  let pem = credentials.private_key || ''
  pem = pem.replace(/\\n/g, '\n')
  pem = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '')
  pem = pem.replace(/-----END PRIVATE KEY-----/g, '')
  // Strip all non-base64 characters
  pem = pem.replace(/[^A-Za-z0-9+/=]/g, '')

  if (!pem) {
    throw new Error('Private key PEM is empty after cleanup')
  }

  // Convert base64 PEM to binary DER buffer
  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    textEncoder.encode(signatureInput)
  )

  const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuffer))
  const jwt = `${signatureInput}.${encodedSignature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Failed to exchange JWT assertion for access token (${res.status}): ${errText}`)
  }

  const data = await res.json()
  return data.access_token
}

export interface SendPushNotificationOptions {
  toUsers: string[] // ['Sourabh', 'Asher'] or ['All'] / ['all']
  title: string
  body: string
  type: string // 'check_in' | 'check_out' | 'task_reminder' | 'meeting_alert' | ...
  entityId?: string
  entityType?: string
  priority?: 'high' | 'normal' | 'low'
  supabaseUrl: string
  supabaseKey: string
  fcmServerKey?: string
}

export async function sendPushNotification({
  toUsers,
  title,
  body,
  type,
  entityId,
  entityType,
  priority = 'normal',
  supabaseUrl,
  supabaseKey,
  fcmServerKey,
}: SendPushNotificationOptions) {
  const isHighPriority =
    priority === 'high' ||
    type === 'meeting_alert' ||
    type === 'auto_check_out' ||
    type === 'check_in_reminder' ||
    type === 'task_reminder'

  const deepLink = getDeepLinkUrl(type)

  // 1. Check if target is 'all' / 'All' or specific users
  const isAll = toUsers.some((u) => u && u.toLowerCase() === 'all')
  const cleanUsers = toUsers.map((u) => u.trim()).filter((u) => u && u.toLowerCase() !== 'all')

  let tokenQuery = `${supabaseUrl}/rest/v1/push_tokens?is_active=eq.true&select=fcm_token,user_name,platform`
  if (!isAll) {
    if (cleanUsers.length === 0) {
      console.log('No valid target users specified for push notification')
      return { success: false, message: 'No target users' }
    }
    tokenQuery += `&user_name=in.(${cleanUsers.map((u) => `"${u}"`).join(',')})`
  }

  const tokenRes = await fetch(tokenQuery, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  })

  if (!tokenRes.ok) {
    console.error('Failed to query push_tokens from Supabase:', tokenRes.status, await tokenRes.text())
    return { success: false, error: 'Database token query failed' }
  }

  const tokens: { fcm_token: string; user_name: string; platform?: string }[] = await tokenRes.json()

  if (!tokens || tokens.length === 0) {
    console.log('No active push tokens found for users:', toUsers)
    return { success: true, message: 'No active device tokens found', sent_count: 0 }
  }

  console.log(`Found ${tokens.length} active device token(s) for target users:`, toUsers)

  // 2. Check for Service Account credentials for FCM HTTP v1
  const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  let projectId = Deno.env.get('FIREBASE_PROJECT_ID') || ''
  let clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL') || ''
  let privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY') || ''

  if (saJson) {
    try {
      const credentials = JSON.parse(saJson)
      projectId = credentials.project_id || projectId
      clientEmail = credentials.client_email || clientEmail
      privateKey = credentials.private_key || privateKey
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT secret:', e)
    }
  }

  const useV1 = Boolean(projectId && clientEmail && privateKey)
  const expiredTokens: string[] = []
  let successCount = 0
  let failureCount = 0
  const fcmResults: Array<{ token: string; user: string; ok: boolean; status?: number; error?: any }> = []

  if (useV1) {
    console.log(`Dispatching via FCM HTTP v1 (Project: ${projectId})...`)
    try {
      const accessToken = await getAccessToken({
        client_email: clientEmail,
        private_key: privateKey,
      })

      const sendPromises = tokens.map(async (t) => {
        const payload = {
          message: {
            token: t.fcm_token,
            notification: {
              title,
              body,
            },
            data: {
              type: String(type || 'system'),
              entity_id: String(entityId || ''),
              entity_type: String(entityType || ''),
              priority: String(priority || 'normal'),
              title: String(title || ''),
              body: String(body || ''),
              url: String(deepLink),
            },
            webpush: {
              headers: {
                Urgency: isHighPriority ? 'high' : 'normal',
              },
              notification: {
                title,
                body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                requireInteraction: isHighPriority,
                tag: entityId ? `autobee-${entityId}` : `autobee-${type}-${Date.now()}`,
              },
              fcm_options: {
                link: deepLink,
              },
            },
            android: {
              priority: isHighPriority ? 'high' : 'normal',
              notification: {
                icon: 'notification_icon',
                color: '#FFC107',
                sound: 'default',
              },
            },
          },
        }

        try {
          const fcmRes = await fetch(
            `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(payload),
            }
          )

          const result = await fcmRes.json().catch(() => ({}))

          if (fcmRes.ok) {
            successCount++
            fcmResults.push({
              token: t.fcm_token.slice(0, 15) + '...',
              user: t.user_name,
              ok: true,
            })
            console.log(`[FCM v1 SUCCESS] Sent to ${t.user_name} (${t.platform || 'device'}): ${result.name}`)
          } else {
            failureCount++
            const errStatus = result.error?.status || result.error?.details?.[0]?.errorCode
            const errMsg = String(result.error?.message || '')
            const isUnregistered =
              errStatus === 'UNREGISTERED' ||
              errStatus === 'INVALID_ARGUMENT' ||
              errMsg.includes('registration-token-not-registered') ||
              errMsg.includes('NotRegistered') ||
              errMsg.includes('Device unregistered')

            if (isUnregistered) {
              expiredTokens.push(t.fcm_token)
            }

            fcmResults.push({
              token: t.fcm_token.slice(0, 15) + '...',
              user: t.user_name,
              ok: false,
              status: fcmRes.status,
              error: result.error || result,
            })
            console.warn(`[FCM v1 FAILED] ${t.user_name}:`, JSON.stringify(result))
          }
        } catch (err: any) {
          failureCount++
          fcmResults.push({
            token: t.fcm_token.slice(0, 15) + '...',
            user: t.user_name,
            ok: false,
            error: err.message,
          })
          console.error(`[FCM v1 Network Error] ${t.user_name}:`, err)
        }
      })

      await Promise.allSettled(sendPromises)
    } catch (v1Err: any) {
      console.error('FCM HTTP v1 error during authorization or dispatch:', v1Err)
    }
  } else {
    // FCM Legacy API (fcm.googleapis.com/fcm/send) was deprecated June 2024 and removed.
    // Only FCM HTTP v1 with a Service Account is supported.
    console.warn('No FCM HTTP v1 Service Account credentials configured. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.')
  }

  // 3. Log notification attempt in notification_log table — matches schema exactly
  // (success_count, failure_count, details JSONB — not sent_at / metadata)
  try {
    await fetch(`${supabaseUrl}/rest/v1/notification_log`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        title,
        body,
        type: String(type || 'system'),
        entity_type: entityType || null,
        entity_id: entityId || null,
        sent_to: toUsers,
        tokens_count: tokens.length,
        success_count: successCount,
        failure_count: failureCount,
        details: {
          results: fcmResults,
          method: useV1 ? 'v1' : 'legacy',
          sent_at: new Date().toISOString(),
        },
      }),
    })
  } catch (logErr) {
    console.error('Failed to write to notification_log:', logErr)
  }

  // 4. Deactivate expired/invalid tokens (self-healing)
  if (expiredTokens.length > 0) {
    console.log(`Deactivating ${expiredTokens.length} expired or invalid token(s)...`)
    try {
      await fetch(
        `${supabaseUrl}/rest/v1/push_tokens?fcm_token=in.(${expiredTokens.map((t) => `"${t}"`).join(',')})`,
        {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() }),
        }
      )
    } catch (deactErr) {
      console.error('Failed to deactivate expired tokens:', deactErr)
    }
  }

  return {
    success: successCount > 0,
    tokensCount: tokens.length,
    successCount,
    failureCount,
    details: fcmResults,
  }
}
