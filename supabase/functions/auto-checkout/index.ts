// AutoBee OS — Strict MANUAL CHECKOUT ONLY
// Automatic 7:00 PM checkout is permanently disabled per system requirements.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (_req) => {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Automatic checkout is permanently disabled — AutoBee OS uses manual checkout only.',
      processed: 0,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
