'use client'

import { cn } from '@/lib/utils'
import type { UIMessage } from 'ai'

function getMessageText(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'
  const text = getMessageText(message)

  return (
    <div className={cn('flex gap-3 w-full', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-1">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      )}

      <div
        className={cn(
          'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-chat-user-bubble text-chat-user-text rounded-br-sm border border-border'
            : 'bg-chat-ai-bubble text-chat-ai-text rounded-bl-sm border border-border/50'
        )}
      >
        <MessageText text={text} />
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  )
}

function MessageText({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g)

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const codeContent = part.replace(/^```[^\n]*\n?/, '').replace(/```$/, '')
          return (
            <pre
              key={i}
              className="bg-black/40 rounded-lg p-3 text-xs font-mono overflow-x-auto text-foreground/90 border border-border/30"
            >
              <code>{codeContent}</code>
            </pre>
          )
        }

        const lines = part.split('\n')
        return (
          <div key={i} className="space-y-1">
            {lines.map((line, j) => {
              if (!line.trim()) return <br key={j} />

              const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              const withCode = formatted.replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')

              return (
                <p
                  key={j}
                  dangerouslySetInnerHTML={{ __html: withCode }}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 w-full justify-start">
      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-1">
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="bg-chat-ai-bubble border border-border/50 px-4 py-3 rounded-2xl rounded-bl-sm">
        <div className="flex items-center gap-1">
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  )
}
