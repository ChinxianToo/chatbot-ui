'use client'

import { useRef, useEffect } from 'react'
import type { UIMessage } from 'ai'
import { MessageBubble, TypingIndicator } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { EmptyState } from './EmptyState'

export function ChatWindow({
  messages,
  input,
  status,
  onInputChange,
  onSubmit,
  onStop,
  onSuggestion,
  onToggleSidebar,
  isSidebarOpen,
}: {
  messages: UIMessage[]
  input: string
  status: 'ready' | 'streaming' | 'submitted' | 'error'
  onInputChange: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  onSuggestion: (text: string) => void
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  const lastMessage = messages[messages.length - 1]
  const showTyping = isLoading && lastMessage?.role === 'user'

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors md:hidden"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {messages.length === 0 ? 'New conversation' : 'Chat'}
          </span>
          {isLoading && (
            <span className="text-xs text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Thinking...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          GPT-4o mini
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <EmptyState onSuggestion={onSuggestion} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {showTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pb-6 pt-3 border-t border-border">
        <ChatInput
          input={input}
          onChange={onInputChange}
          onSubmit={onSubmit}
          isLoading={isLoading}
          onStop={onStop}
        />
      </div>
    </div>
  )
}
