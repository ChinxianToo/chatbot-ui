'use client'

import { useState, useCallback, useRef } from 'react'

const GATEWAY_URL = process.env.NEXT_PUBLIC_AI_GATEWAY_URL ?? ''

export function useChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvIdState] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<'ready' | 'streaming' | 'submitted' | 'error'>('ready')
  const [input, setInput] = useState('')
  // Live status text shown in the typing indicator ("Searching knowledge base …")
  const [streamingStatus, setStreamingStatus] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const threadIds = useRef(new Map<string, string>())
  const activeConvIdRef = useRef<string | null>(null)

  const setActiveConvId = useCallback((id: string | null) => {
    activeConvIdRef.current = id
    setActiveConvIdState(id)
  }, [])

  // ── streaming ──────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStreamingStatus('')
    setStatus('ready')
  }, [])

  const streamMessage = useCallback(async (text: string, convId: string) => {
    const threadId = threadIds.current.get(convId) ?? null

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }])
    setStatus('submitted')
    setStreamingStatus('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, thread_id: threadId }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ Request failed (HTTP ${res.status}). Check that NEXT_PUBLIC_AI_GATEWAY_URL is set in your Vercel environment variables.`,
          },
        ])
        setStatus('error')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantContent = ''
      const assistantId = crypto.randomUUID()

      // Pending state captured before the first visible event
      let pendingGuardrail: GuardrailStatus | undefined
      let bubbleSeeded = false

      // Seed the assistant bubble on the first content-producing event so the
      // typing indicator stays visible for the full pre-token phase.
      const seedBubble = (extra?: Partial<Message>) => {
        if (bubbleSeeded) return
        bubbleSeeded = true
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: 'assistant',
            content: '',
            guardrailStatus: pendingGuardrail,
            ...extra,
          },
        ])
        setStatus('streaming')
        setStreamingStatus('')
      }

      loop: while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop()!

        for (const chunk of chunks) {
          // Parse all SSE fields — gateway emits:  event: <type>\ndata: <json>
          const lines = chunk.split('\n')
          let sseEvent = ''
          let sseData = ''
          for (const line of lines) {
            if (line.startsWith('event:')) sseEvent = line.slice(6).trim()
            else if (line.startsWith('data:')) sseData = line.slice(5).trim()
          }

          if (!sseData) continue
          if (sseData === '[DONE]') break loop

          let ev: Record<string, unknown>
          try { ev = JSON.parse(sseData) } catch { continue }

          const eventType = (ev.event as string | undefined) ?? sseEvent

          switch (eventType) {
            case 'start':
              threadIds.current.set(convId, ev.thread_id as string)
              break

            case 'guardrail':
              // Capture status — bubble may not exist yet; apply when seeding
              pendingGuardrail = ev.status as GuardrailStatus
              break

            case 'status':
              // Show live progress in the typing indicator
              setStreamingStatus((ev.message as string) ?? '')
              break

            case 'retrieval':
              // Informational — no UI action needed
              break

            case 'token':
              seedBubble()
              assistantContent += (ev.content ?? ev.text ?? '') as string
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: assistantContent } : m)
              )
              break

            case 'export_ready': {
              const exportInfo: ExportInfo = {
                downloadUrl: `${GATEWAY_URL}${ev.download_url as string}`,
                filename: ev.filename as string,
                division: ev.division as string,
                divisionSummary: (ev.division_summary ?? '') as string,
                startYear: String(ev.start_year ?? ''),
                endYear: String(ev.end_year ?? ''),
                recordCount: Number(ev.record_count ?? 0),
              }
              seedBubble({ exportInfo })
              // If bubble was already seeded, patch exportInfo in
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, exportInfo } : m)
              )
              break
            }

            case 'done':
              // Also capture thread_id from done in case start was missed
              if (ev.thread_id) threadIds.current.set(convId, ev.thread_id as string)
              break loop

            case 'error':
              seedBubble()
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `⚠️ ${(ev.message as string) ?? 'Gateway error'}` }
                    : m
                )
              )
              setStatus('error')
              break loop
          }
        }
      }

      setStreamingStatus('')
      setStatus('ready')
    } catch (err) {
      setStreamingStatus('')
      if ((err as Error).name !== 'AbortError') setStatus('error')
      else setStatus('ready')
    }
  }, [])

  // ── conversation management ────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    const newId = crypto.randomUUID()
    setConversations((prev) => [
      {
        id: newId,
        title: 'New conversation',
        preview: 'Start a new conversation',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ])
    setActiveConvId(newId)
    setMessages([])
  }, [setActiveConvId])

  const handleSubmit = useCallback(() => {
    if (!input.trim() || status === 'streaming' || status === 'submitted') return

    let convId = activeConvIdRef.current

    if (!convId) {
      convId = crypto.randomUUID()
      setConversations((prev) => [
        {
          id: convId!,
          title: input.slice(0, 40) + (input.length > 40 ? '...' : ''),
          preview: input.slice(0, 60),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ])
      setActiveConvId(convId)
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId && c.title === 'New conversation'
            ? { ...c, title: input.slice(0, 40) + (input.length > 40 ? '...' : ''), preview: input.slice(0, 60) }
            : c
        )
      )
    }

    const text = input
    setInput('')
    streamMessage(text, convId)
  }, [input, status, streamMessage, setActiveConvId])

  const handleSuggestion = useCallback((text: string) => {
    setInput(text)
  }, [])

  const handleSelectConv = useCallback((id: string) => {
    setActiveConvId(id)
  }, [setActiveConvId])

  const handleDeleteConv = useCallback((id: string) => {
    const threadId = threadIds.current.get(id)
    if (threadId) {
      fetch(`${GATEWAY_URL}/v1/sessions/${threadId}`, { method: 'DELETE' }).catch(() => {})
      threadIds.current.delete(id)
    }
    if (activeConvIdRef.current === id) {
      setMessages([])
      setActiveConvId(null)
    }
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }, [setActiveConvId])

  return {
    sidebarOpen,
    setSidebarOpen,
    conversations,
    activeConvId,
    input,
    setInput,
    messages,
    status,
    streamingStatus,
    stop,
    handleNewChat,
    handleSubmit,
    handleSuggestion,
    handleSelectConv,
    handleDeleteConv,
  }
}
