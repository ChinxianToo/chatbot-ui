export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.AI_GATEWAY_URL!

export async function POST(request: Request) {
  const body = await request.json()

  let gatewayRes: Response
  try {
    gatewayRes = await fetch(`${GATEWAY_URL}/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return new Response('Gateway unreachable', { status: 502 })
  }

  if (!gatewayRes.ok || !gatewayRes.body) {
    return new Response('Gateway error', { status: gatewayRes.status })
  }

  return new Response(gatewayRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      // Tells Vercel/nginx not to buffer the SSE stream
      'X-Accel-Buffering': 'no',
    },
  })
}
