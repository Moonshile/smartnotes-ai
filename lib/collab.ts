import * as Y from 'yjs'
// y-websocket is ESM; import dynamically in browser only

export type CollabContext = {
  doc: Y.Doc
  provider: any
  awareness: any
}

export async function createCollab(room: string, wsUrl = 'ws://localhost:1234'): Promise<CollabContext> {
  const doc = new Y.Doc()
  const { WebsocketProvider } = await import('y-websocket')
  const provider = new WebsocketProvider(wsUrl, room, doc, { connect: true }) as any
  const awareness = provider.awareness
  return { doc, provider, awareness }
}

export function getUserIdentity() {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('user-name') : null
  const name = stored || `User-${Math.floor(Math.random() * 1000)}`
  if (!stored && typeof window !== 'undefined') localStorage.setItem('user-name', name)
  const colors = [
    { color: '#2563eb', background: '#bfdbfe' },
    { color: '#7c3aed', background: '#e9d5ff' },
    { color: '#059669', background: '#bbf7d0' },
    { color: '#d97706', background: '#fde68a' },
  ]
  const pick = colors[name.charCodeAt(0) % colors.length]
  return { name, color: pick.color, bg: pick.background }
}

