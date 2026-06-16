// Shared helper: send FCM push to a list of user names

async function getAccessToken(credentials: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const textEncoder = new TextEncoder();
  
  const base64UrlEncode = (u8: Uint8Array) => {
    let bin = "";
    for (let i = 0; i < u8.length; i++) {
      bin += String.fromCharCode(u8[i]);
    }
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  const encodedHeader = base64UrlEncode(textEncoder.encode(JSON.stringify(header)));
  const encodedClaimSet = base64UrlEncode(textEncoder.encode(JSON.stringify(claimSet)));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  // Clean private key PEM
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = credentials.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s+/g, "");
  
  // Convert base64 PEM to binary DER buffer
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    textEncoder.encode(signatureInput)
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuffer));
  const jwt = `${signatureInput}.${encodedSignature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to exchange JWT assertion for access token: ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function sendPushNotification({
  toUsers,        // ['Sourabh', 'Asher'] — or ['all'] for everyone
  title,
  body,
  type,           // 'task_reminder' | 'meeting_alert' | 'meeting_change' | 'ai_brief'
  entityId,
  entityType,
  supabaseUrl,
  supabaseKey,
  fcmServerKey,
}: {
  toUsers: string[]
  title: string
  body: string
  type: string
  entityId?: string
  entityType?: string
  supabaseUrl: string
  supabaseKey: string
  fcmServerKey: string
}) {
  // 1. Get FCM tokens for target users from Supabase
  const tokenQuery = toUsers.includes('all')
    ? `${supabaseUrl}/rest/v1/push_tokens?is_active=eq.true&select=fcm_token,user_name`
    : `${supabaseUrl}/rest/v1/push_tokens?is_active=eq.true&user_name=in.(${toUsers.map(u => `"${u}"`).join(',')})&select=fcm_token,user_name`

  const tokenRes = await fetch(tokenQuery, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  })

  const tokens: { fcm_token: string; user_name: string }[] = await tokenRes.json()

  if (!tokens || tokens.length === 0) {
    console.log('No push tokens found for users:', toUsers)
    return
  }

  // Check if we have Service Account credentials for FCM HTTP v1
  const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  let projectId = Deno.env.get('FIREBASE_PROJECT_ID') || '';
  let clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL') || '';
  let privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY') || '';

  if (saJson) {
    try {
      const credentials = JSON.parse(saJson);
      projectId = credentials.project_id || projectId;
      clientEmail = credentials.client_email || clientEmail;
      privateKey = credentials.private_key || privateKey;
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT secret:', e);
    }
  }

  const useV1 = projectId && clientEmail && privateKey;

  if (useV1) {
    console.log('Using FCM HTTP v1 API...');
    try {
      const accessToken = await getAccessToken({
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      });

      const fcmResults: Array<{token: string; ok: boolean; result: any}> = [];
      const expiredTokens: string[] = [];
      const sendPromises = tokens.map(async (t) => {
        const payload = {
          message: {
            token: t.fcm_token,
            notification: { title, body },
            data: {
              type,
              entity_id: entityId ?? '',
              entity_type: entityType ?? '',
            },
            webpush: {
              notification: {
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                requireInteraction: type === 'meeting_alert',
              },
              fcm_options: { link: '/' },
            },
          },
        };

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
        );

        const result = await fcmRes.json();
        fcmResults.push({ token: t.fcm_token.slice(0, 20) + '...', ok: fcmRes.ok, result });
        
        if (fcmRes.ok) {
          console.log(`FCM v1 SUCCESS for ${t.user_name} (${t.fcm_token.slice(0, 15)}...): message=${result.name}`);
        } else {
          console.warn(`FCM v1 FAILED for ${t.user_name} (${t.fcm_token.slice(0, 15)}...):`, JSON.stringify(result));
          const errStatus = result.error?.status;
          if (errStatus === 'UNREGISTERED' || errStatus === 'INVALID_ARGUMENT') {
            expiredTokens.push(t.fcm_token);
          }
        }
      });

      await Promise.all(sendPromises);

      // Log notification
      await fetch(`${supabaseUrl}/rest/v1/notification_log`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          type,
          entity_type: entityType,
          entity_id: entityId,
          sent_to: toUsers,
          tokens_count: tokens.length,
        }),
      });

      // Deactivate expired tokens
      if (expiredTokens.length > 0) {
        console.log('Deactivating expired tokens:', expiredTokens.length);
        await fetch(
          `${supabaseUrl}/rest/v1/push_tokens?fcm_token=in.(${expiredTokens.map(t => `"${t}"`).join(',')})`,
          {
            method: 'PATCH',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_active: false }),
          }
        );
      }

      return { success: true, method: 'v1', fcmResults };
    } catch (err) {
      console.error('FCM HTTP v1 dispatch error:', err);
      // fallback to legacy if fcmServerKey is somehow set
      if (!fcmServerKey) return;
    }
  }

  // Fallback / legacy FCM API
  console.log('Using FCM Legacy HTTP API...');
  const fcmPayload = {
    registration_ids: tokens.map(t => t.fcm_token),
    notification: { title, body },
    data: {
      type,
      entity_id: entityId ?? '',
      entity_type: entityType ?? '',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    android: {
      priority: 'high',
      notification: {
        icon: 'notification_icon',
        color: '#FFC107',
        sound: 'default',
      },
    },
    webpush: {
      notification: {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        requireInteraction: type === 'meeting_alert',
      },
      fcm_options: { link: '/' },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
        },
      },
    },
  }

  const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${fcmServerKey}`,
    },
    body: JSON.stringify(fcmPayload),
  })

  const fcmResult = await fcmRes.json()

  // Log notification
  await fetch(`${supabaseUrl}/rest/v1/notification_log`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      type,
      entity_type: entityType,
      entity_id: entityId,
      sent_to: toUsers,
      tokens_count: tokens.length,
    }),
  })

  // Handle expired tokens
  if (fcmResult.results) {
    const expiredTokens = tokens
      .filter((_, i) => fcmResult.results[i]?.error === 'NotRegistered' || fcmResult.results[i]?.error === 'InvalidRegistration')
      .map(t => t.fcm_token)

    if (expiredTokens.length > 0) {
      await fetch(
        `${supabaseUrl}/rest/v1/push_tokens?fcm_token=in.(${expiredTokens.map(t => `"${t}"`).join(',')})`,
        {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: false }),
        }
      )
    }
  }

  return fcmResult
}
