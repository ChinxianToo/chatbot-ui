'use client'

import { useState, useCallback, useRef } from 'react'

const GATEWAY_URL = process.env.NEXT_PUBLIC_AI_GATEWAY_URL!

export function useChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvIdState] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<'ready' | 'streaming' | 'submitted' | 'error'>('ready')
  const [input, setInput] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  // Keyed by conversation id — survives re-renders without causing them
  const threadIds = useRef(new Map<string, string>())
  // Ref mirror of activeConvId so async callbacks can read it without stale closure
  const activeConvIdRef = useRef<string | null>(null)

  const setActiveConvId = useCallback((id: string | null) => {
    activeConvIdRef.current = id
    setActiveConvIdState(id)
  }, [])

  // ── streaming ──────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStatus('ready')
  }, [])

  const streamMessage = useCallback(async (text: string, convId: string) => {
    const threadId = threadIds.current.get(convId) ?? null

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }])
    setStatus('submitted')

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
          { id: crypto.randomUUID(), role: 'assistant', content: `⚠️ Request failed (HTTP ${res.status}). Check that the gateway URL is configured correctly in Vercel environment variables.` },
        ])
        setStatus('error')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantContent = ''
      const assistantId = crypto.randomUUID()

      // Seed an empty assistant bubble to stream tokens into
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])
      setStatus('streaming')

      loop: while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop()!

        for (const chunk of chunks) {
          // Parse SSE fields — an event block may contain multiple lines:
          //   event: token          ← optional SSE event type
          //   data: {"content":"…"} ← payload
          const lines = chunk.split('\n')
          let sseEvent = ''
          let sseData = ''
          for (const line of lines) {
            if (line.startsWith('event:')) sseEvent = line.slice(6).trim()
            else if (line.startsWith('data:')) sseData = line.slice(5).trim()
          }

          if (!sseData) continue
          if (sseData === '[DONE]') break loop

          let ev: Record<string, string>
          try { ev = JSON.parse(sseData) } catch { continue }

          // Resolve event type: prefer JSON "event" field, fall back to SSE "event:" line
          const eventType = ev.event ?? sseEvent

          switch (eventType) {
            case 'start':
              threadIds.current.set(convId, ev.thread_id)
              break
            case 'token':
              assistantContent += ev.content ?? ev.text ?? ''
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: assistantContent } : m)
              )
              break
            case 'error':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `⚠️ ${ev.message ?? 'Gateway error'}` }
                    : m
                )
              )
              setStatus('error')
              break loop
          }
        }
      }

      setStatus('ready')
    } catch (err) {
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
      // Update title from the first user message if still at default
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
      // Inform the gateway to clear LangGraph history — fire-and-forget
      fetch(`${GATEWAY_URL}/v1/sessions/${threadId}`, { method: 'DELETE' }).catch(() => {})
      threadIds.current.delete(id)
    }
    // Clear messages if the active conversation is being deleted
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
    stop,
    handleNewChat,
    handleSubmit,
    handleSuggestion,
    handleSelectConv,
    handleDeleteConv,
  }
}
