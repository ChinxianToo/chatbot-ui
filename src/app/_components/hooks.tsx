'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { loadChatState, saveChatState } from '@/lib/chat-storage'

const GATEWAY_URL = process.env.NEXT_PUBLIC_AI_GATEWAY_URL ?? ''

export function useChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvIdState] = useState<string | null>(null)
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({})
  const [status, setStatus] = useState<'ready' | 'streaming' | 'submitted' | 'error'>('ready')
  const [input, setInput] = useState('')
  const [streamingStatus, setStreamingStatus] = useState('')
  /** Bumps when gateway thread_id map changes so we persist threadIdsRef. */
  const [threadPersistTick, setThreadPersistTick] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const threadIdsRef = useRef(new Map<string, string>())
  const activeConvIdRef = useRef<string | null>(null)
  const hydratedRef = useRef(false)

  const messages = useMemo(
    () => (activeConvId ? (messagesByConv[activeConvId] ?? []) : []),
    [activeConvId, messagesByConv]
  )

  const setActiveConvId = useCallback((id: string | null) => {
    activeConvIdRef.current = id
    setActiveConvIdState(id)
  }, [])

  const bumpThreadPersist = useCallback(() => {
    setThreadPersistTick((t) => t + 1)
  }, [])

  const updateMessagesForConv = useCallback(
    (convId: string, updater: (prev: Message[]) => Message[]) => {
      setMessagesByConv((prev) => {
        const cur = prev[convId] ?? []
        return { ...prev, [convId]: updater(cur) }
      })
    },
    []
  )

  // Hydrate from localStorage after mount (avoids SSR/localStorage clash & wiping store).
  useEffect(() => {
    const saved = loadChatState()
    if (saved?.conversations?.length) {
      setConversations(saved.conversations)
    }
    if (saved?.activeConvId !== undefined) {
      activeConvIdRef.current = saved.activeConvId
      setActiveConvIdState(saved.activeConvId)
    }
    if (saved?.messagesByConv && Object.keys(saved.messagesByConv).length > 0) {
      setMessagesByConv(saved.messagesByConv)
    }
    if (saved?.threadIds) {
      threadIdsRef.current = new Map(Object.entries(saved.threadIds))
    }
    hydratedRef.current = true
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return
    saveChatState({
      conversations,
      activeConvId,
      messagesByConv,
      threadIds: Object.fromEntries(threadIdsRef.current),
    })
  }, [conversations, activeConvId, messagesByConv, threadPersistTick])

  // ── streaming ──────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStreamingStatus('')
    setStatus('ready')
  }, [])

  const streamMessage = useCallback(async (text: string, convId: string) => {
    const threadId = threadIdsRef.current.get(convId) ?? null

    updateMessagesForConv(convId, (prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }])
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
        updateMessagesForConv(convId, (prev) => [
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

      let pendingGuardrail: GuardrailStatus | undefined
      let bubbleSeeded = false

      const seedBubble = (extra?: Partial<Message>) => {
        if (bubbleSeeded) return
        bubbleSeeded = true
        updateMessagesForConv(convId, (prev) => [
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
              threadIdsRef.current.set(convId, ev.thread_id as string)
              bumpThreadPersist()
              break

            case 'guardrail':
              pendingGuardrail = ev.status as GuardrailStatus
              break

            case 'status':
              setStreamingStatus((ev.message as string) ?? '')
              break

            case 'retrieval':
              break

            case 'token':
              seedBubble()
              assistantContent += (ev.content ?? ev.text ?? '') as string
              updateMessagesForConv(convId, (prev) =>
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
              updateMessagesForConv(convId, (prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, exportInfo } : m)
              )
              break
            }

            case 'done':
              if (ev.thread_id) {
                threadIdsRef.current.set(convId, ev.thread_id as string)
                bumpThreadPersist()
              }
              break loop

            case 'error':
              seedBubble()
              updateMessagesForConv(convId, (prev) =>
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
  }, [bumpThreadPersist, updateMessagesForConv])

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
    setMessagesByConv((prev) => ({ ...prev, [newId]: [] }))
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
      setMessagesByConv((prev) => ({ ...prev, [convId!]: [] }))
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
    const threadId = threadIdsRef.current.get(id)
    if (threadId) {
      fetch(`${GATEWAY_URL}/v1/sessions/${threadId}`, { method: 'DELETE' }).catch(() => {})
      threadIdsRef.current.delete(id)
      bumpThreadPersist()
    }
    setMessagesByConv((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (activeConvIdRef.current === id) {
      setActiveConvId(null)
    }
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }, [bumpThreadPersist, setActiveConvId])

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
