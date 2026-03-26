/** Browser persistence for chat sidebar + messages (survives refresh / dev server restart). */

export const CHAT_STORAGE_KEY = 'chatbot-ui:v1'

export type PersistedChatState = {
  v: 1
  conversations: Conversation[]
  activeConvId: string | null
  messagesByConv: Record<string, Message[]>
  threadIds: Record<string, string>
}

export function loadChatState(): Partial<PersistedChatState> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PersistedChatState
    if (data.v !== 1) return null
    return data
  } catch {
    return null
  }
}

export function saveChatState(state: Omit<PersistedChatState, 'v'>): void {
  if (typeof window === 'undefined') return
  try {
    const payload: PersistedChatState = { v: 1, ...state }
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // quota / private mode
  }
}
