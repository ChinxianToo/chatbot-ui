'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function ChatInput({ input = '', onChange, onSubmit, isLoading, onStop }: {
  input: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  onStop?: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && input.trim()) {
        onSubmit()
      }
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        className={cn(
          'flex items-end gap-3 bg-card border border-border rounded-2xl px-4 py-3 transition-all duration-200',
          'focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20'
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message AI..."
          disabled={isLoading}
          rows={1}
          className={cn(
            'flex-1 bg-transparent text-foreground placeholder:text-muted-foreground',
            'resize-none outline-none text-sm leading-relaxed',
            'min-h-[24px] max-h-[200px] py-0.5',
            'disabled:opacity-50'
          )}
        />

        <div className="flex items-center gap-2 shrink-0">
          {isLoading ? (
            <button
              onClick={onStop}
              className="w-8 h-8 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive flex items-center justify-center transition-colors"
              aria-label="Stop generation"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!input.trim()}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                input.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed'
              )}
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m-7 7l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-2">
        Press{' '}
        <kbd className="px-1 py-0.5 rounded bg-secondary text-secondary-foreground font-mono text-xs">Enter</kbd>{' '}
        to send,{' '}
        <kbd className="px-1 py-0.5 rounded bg-secondary text-secondary-foreground font-mono text-xs">Shift+Enter</kbd>{' '}
        for new line
      </p>
    </div>
  )
}
