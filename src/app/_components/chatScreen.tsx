'use client'

import { Sidebar } from '@/components/chat/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { useChatPage } from './hooks'

export function ChatScreen() {
  const {
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
  } = useChatPage()

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={setActiveConvId}
        onNew={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <ChatWindow
          messages={messages}
          input={input}
          status={status}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onStop={stop}
          onSuggestion={handleSuggestion}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          isSidebarOpen={sidebarOpen}
        />
      </div>
    </main>
  )
}
