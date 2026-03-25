export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.AI_GATEWAY_URL ?? process.env.NEXT_PUBLIC_AI_GATEWAY_URL

/** GET /api/chat/stream — diagnostic: confirms env var and gateway reachability */
export async function GET() {
  if (!GATEWAY_URL) {
    return Response.json({ ok: false, error: 'AI_GATEWAY_URL / NEXT_PUBLIC_AI_GATEWAY_URL is not set' }, { status: 500 })
  }

  let reachable = false
  try {
    const probe = await fetch(`${GATEWAY_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(4000) })
    reachable = probe.ok
  } catch {
    // ignore — gateway may not have /health but we still report the URL
  }

  return Response.json({
    ok: true,
    gatewayHost: new URL(GATEWAY_URL).host,
    reachable,
  })
}

export async function POST(request: Request) {
  const body = await request.json()

  if (!GATEWAY_URL) {
    return new Response(
      'data: {"event":"error","message":"AI_GATEWAY_URL is not configured on the server"}\n\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  let gatewayRes: Response
  try {
    gatewayRes = await fetch(`${GATEWAY_URL}/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gateway unreachable'
    return new Response(
      `data: {"event":"error","message":"${msg}"}\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  if (!gatewayRes.ok || !gatewayRes.body) {
    const text = await gatewayRes.text().catch(() => '')
    return new Response(
      `data: {"event":"error","message":"Gateway returned ${gatewayRes.status}: ${text.slice(0, 200)}"}\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }

  return new Response(gatewayRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
