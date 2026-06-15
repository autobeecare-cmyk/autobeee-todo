import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  const swPath = join(process.cwd(), 'public', 'firebase-messaging-sw.js')
  let swContent = readFileSync(swPath, 'utf8')

  // Inject environment variables into service worker
  swContent = swContent
    .replace('__FIREBASE_API_KEY__', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '')
    .replace('__FIREBASE_AUTH_DOMAIN__', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '')
    .replace('__FIREBASE_PROJECT_ID__', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '')
    .replace('__FIREBASE_MESSAGING_SENDER_ID__', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '')
    .replace('__FIREBASE_APP_ID__', process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '')

  return new NextResponse(swContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
    },
  })
}
