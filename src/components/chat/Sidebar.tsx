'use client'

import { cn } from '@/lib/utils'

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onToggle,
}: {
  conversations: { id: string; title: string; preview: string; time: string }[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          'fixed md:relative z-30 md:z-auto flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300',
          isOpen ? 'w-72 translate-x-0' : 'w-0 md:w-16 -translate-x-full md:translate-x-0 overflow-hidden'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border shrink-0">
          {isOpen && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-semibold text-sidebar-foreground text-sm">AI Chat</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>

        <div className="p-3 shrink-0">
          <button
            onClick={onNew}
            className={cn(
              'w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors text-sm font-medium',
              !isOpen && 'justify-center'
            )}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isOpen && <span>New chat</span>}
          </button>
        </div>

        {isOpen && (
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-lg transition-colors',
                    activeId === conv.id
                      ? 'bg-sidebar-accent text-sidebar-foreground'
                      : 'hover:bg-sidebar-accent/50 text-muted-foreground hover:text-sidebar-foreground'
                  )}
                >
                  <button
                    onClick={() => onSelect(conv.id)}
                    className="flex-1 min-w-0 text-left px-3 py-2.5"
                  >
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs truncate mt-0.5 opacity-60">{conv.preview}</p>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id) }}
                    className="shrink-0 mr-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all"
                    aria-label="Delete conversation"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {isOpen && (
          <div className="p-3 border-t border-sidebar-border shrink-0">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">Guest User</p>
                <p className="text-xs text-muted-foreground">Free plan</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
