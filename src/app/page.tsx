import { Suspense } from 'react'
import { ChatScreen } from './_components/chatScreen'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatScreen />
    </Suspense>
  )
}
