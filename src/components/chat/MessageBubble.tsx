'use client'

import { cn } from '@/lib/utils'

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

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
          'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed space-y-3',
          isUser
            ? 'bg-chat-user-bubble text-chat-user-text rounded-br-sm border border-border'
            : 'bg-chat-ai-bubble text-chat-ai-text rounded-bl-sm border border-border/50'
        )}
      >
        <MessageText text={message.content} />

        {message.exportInfo && <ExportButton info={message.exportInfo} />}

        {!isUser && message.guardrailStatus && (
          <GuardrailBadge status={message.guardrailStatus} />
        )}

        {!isUser && message.latencyMs != null && (
          <LatencyFootnote ms={message.latencyMs} />
        )}
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

// ── Sub-components ────────────────────────────────────────────────────────────

function ExportButton({ info }: { info: ExportInfo }) {
  return (
    <a
      href={info.downloadUrl}
      download={info.filename}
      className={cn(
        'flex items-center gap-2 w-fit',
        'px-3 py-2 rounded-xl text-xs font-medium',
        'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20',
        'transition-colors duration-150'
      )}
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span>
        Download {info.filename}
        {info.recordCount > 0 && (
          <span className="ml-1 opacity-70">({info.recordCount} rows)</span>
        )}
      </span>
    </a>
  )
}

const GUARDRAIL_LABELS: Record<GuardrailStatus, { label: string; classes: string }> = {
  passed:            { label: 'Verified CPI data',      classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  blocked_offtopic:  { label: 'Out of scope',            classes: 'bg-amber-500/10  text-amber-400  border-amber-500/20'  },
  blocked_year:      { label: 'Year outside 1960–2025',  classes: 'bg-amber-500/10  text-amber-400  border-amber-500/20'  },
}

function GuardrailBadge({ status }: { status: GuardrailStatus }) {
  const { label, classes } = GUARDRAIL_LABELS[status]
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium', classes)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}

function LatencyFootnote({ ms }: { ms: number }) {
  const label = ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`
  return (
    <p className="text-[10px] text-muted-foreground/80 tabular-nums pt-0.5 border-t border-border/30 mt-2">
      Response latency: {label}
    </p>
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
              return <p key={j} dangerouslySetInnerHTML={{ __html: withCode }} />
            })}
          </div>
        )
      })}
    </div>
  )
}

export function TypingIndicator({ statusMessage }: { statusMessage?: string }) {
  return (
    <div className="flex gap-3 w-full justify-start">
      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-1">
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="bg-chat-ai-bubble border border-border/50 px-4 py-3 rounded-2xl rounded-bl-sm flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
        </div>
        {statusMessage && (
          <span className="text-[11px] text-muted-foreground/70 italic">{statusMessage}</span>
        )}
      </div>
    </div>
  )
}
