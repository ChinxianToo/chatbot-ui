'use client'

import { useState, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

export function useChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: process.env.NEXT_PUBLIC_AI_GATEWAY_URL! }),
    onFinish: () => {
      const firstUserMsg = messages.find((m) => m.role === 'user')
      if (firstUserMsg && activeConvId) {
        const text = firstUserMsg.parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('')

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? {
                  ...c,
                  title: text.slice(0, 40) + (text.length > 40 ? '...' : ''),
                  preview: text.slice(0, 60) + (text.length > 60 ? '...' : ''),
                }
              : c
          )
        )
      }
    },
  })

  const handleNewChat = useCallback(() => {
    const newId = crypto.randomUUID()
    const newConv: Conversation = {
      id: newId,
      title: 'New conversation',
      preview: 'Start a new conversation',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setConversations((prev) => [newConv, ...prev])
    setActiveConvId(newId)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return

    if (!activeConvId) {
      const newId = crypto.randomUUID()
      const newConv: Conversation = {
        id: newId,
        title: input.slice(0, 40) + (input.length > 40 ? '...' : ''),
        preview: input.slice(0, 60),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setConversations((prev) => [newConv, ...prev])
      setActiveConvId(newId)
    }

    sendMessage({ text: input })
    setInput('')
  }, [input, activeConvId, sendMessage])

  const handleSuggestion = useCallback((text: string) => {
    setInput(text)
  }, [])

  const handleDeleteConv = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setActiveConvId((current) => (current === id ? null : current))
  }, [])

  return {
    sidebarOpen,
    setSidebarOpen,
    conversations,
    activeConvId,
    setActiveConvId,
    input,
    setInput,
    messages,
    status,
    stop,
    handleNewChat,
    handleSubmit,
    handleSuggestion,
    handleDeleteConv,
  }
}
