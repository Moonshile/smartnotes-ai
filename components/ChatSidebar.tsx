"use client"
import { useEffect, useMemo, useRef, useState } from 'react'

type Message = { id: string; role: 'user' | 'assistant' | 'system'; content: string }

export default function ChatSidebar({ docHTML, onInsert }: { docHTML: string; onInsert?: (text: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const contextText = useMemo(() => stripHTML(docHTML).slice(0, 8000), [docHTML])

  async function send() {
    if (!input.trim() || loading) return
    const user: Message = { id: crypto.randomUUID(), role: 'user', content: input }
    setMessages((m) => [...m, user])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, user].map(({ role, content }) => ({ role, content })), context: contextText }),
      })

      if (!res.ok || !res.body) throw new Error('Network error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let assistant: Message = { id: crypto.randomUUID(), role: 'assistant', content: '' }
      setMessages((m) => [...m, assistant])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        // Expect SSE style: lines starting with 'data: '
        const lines = chunk.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const delta: string = json.delta || json.content || ''
            if (!delta) continue
            assistant = { ...assistant, content: assistant.content + delta }
            setMessages((m) => m.map((x) => (x.id === assistant.id ? assistant : x)))
          } catch {
            // Fallback: append raw
            assistant = { ...assistant, content: assistant.content + data }
            setMessages((m) => m.map((x) => (x.id === assistant.id ? assistant : x)))
          }
        }
      }
    } catch (e) {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white/60 backdrop-blur flex items-center gap-2">
        <div className="size-7 rounded-md bg-black text-white grid place-items-center text-sm">AI</div>
        <div className="font-medium gradient-text">Assistant</div>
        <div className="ml-auto" />
      </div>
      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-4 scroll-thin">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
              {m.role !== 'user' && (
                <div className="mr-2 mt-1 size-7 shrink-0 rounded-full bg-slate-900 text-white grid place-items-center text-xs">A</div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-br-sm' : 'text-slate-900 rounded-bl-sm'}`}
                style={m.role === 'user' ? undefined : { backgroundImage: 'linear-gradient(90deg, rgba(99,102,241,.12), rgba(34,211,238,.12))', backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(6px)' }}
              >
                {m.role === 'assistant' ? (
                  <div className="prose prose-slate prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderChatHtml(m.content) }} />
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="ml-2 mt-1 size-7 shrink-0 rounded-full bg-slate-200 text-slate-700 grid place-items-center text-xs">You</div>
              )}
            </div>
            {m.role === 'assistant' && (
              <div className="pl-9 flex items-center gap-2">
                <button
                  type="button"
                  className="text-sm rounded-md px-3 py-1.5 text-white shadow-sm"
                  style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))' }}
                  onClick={() => onInsert?.(m.content)}
                >
                  Insert
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <div className="size-2 animate-bounce rounded-full bg-slate-400" />
            <div className="size-2 animate-bounce [animation-delay:100ms] rounded-full bg-slate-400" />
            <div className="size-2 animate-bounce [animation-delay:200ms] rounded-full bg-slate-400" />
            <span>Thinking…</span>
          </div>
        )}
        {messages.length === 0 && !loading && (
          <div className="text-sm text-slate-500">
            Ask anything about your current note. The assistant uses the open document as context.
          </div>
        )}
      </div>
      <div className="p-3 border-t bg-white/60 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="flex gap-2"
        >
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 bg-white/80"
            placeholder={loading ? 'Thinking…' : 'Ask a question'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="px-3 py-2 text-sm rounded-lg text-white shadow-sm disabled:opacity-50" disabled={loading}
            style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))' }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

function stripHTML(html: string): string {
  if (!html) return ''
  // Very light sanitizer to extract readable text
  const tmp = globalThis.document?.createElement('div')
  if (!tmp) return html
  tmp.innerHTML = html
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim()
}

function renderChatHtml(md: string): string {
  // Basic safe markdown-like rendering for bullets, code, and links.
  const esc = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = (md || '').split(/\r?\n/)
  const blocks: string[] = []
  let i = 0
  while (i < lines.length) {
    // code block ```
    if (lines[i].trim().startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i])
        i++
      }
      // skip closing ``` if present
      if (i < lines.length && lines[i].trim().startsWith('```')) i++
      blocks.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`)
      continue
    }
    // bullet list group (- or *)
    if (/^\s*[-*]\s+/.test(lines[i])) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*[-*]\s+/, '')
        items.push(`<li>${inline(text)}</li>`)
        i++
      }
      blocks.push(`<ul class="list-disc pl-5">${items.join('')}</ul>`)
      continue
    }
    // numbered list group (1.  1)  1、  1．) with optional leading bold **
    const numPattern = /^\s*(?:\*\*|__)?\s*\d+[\.|\)|\u3001|\uFF0E]\s+/
    if (numPattern.test(lines[i])) {
      const items: string[] = []
      while (i < lines.length && numPattern.test(lines[i])) {
        const text = lines[i].replace(numPattern, '')
        items.push(`<li>${inline(text)}</li>`)
        i++
      }
      blocks.push(`<ol class="list-decimal pl-5">${items.join('')}</ol>`)
      continue
    }
    // paragraph (until blank)
    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== '') {
      para.push(lines[i])
      i++
    }
    if (para.length) {
      blocks.push(`<p>${inline(para.join(' '))}</p>`) // join to avoid mid-paragraph breaks
    }
    // skip blank line
    while (i < lines.length && lines[i].trim() === '') i++
  }
  return blocks.join('')

  function inline(s: string) {
    let out = esc(s)
    // inline code `code`
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
    // bold **text** or __text__
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>')
    // italic *text* or _text_ (run after bold)
    out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    out = out.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>')
    // links
    out = out.replace(/(https?:\/\/[^\s)]+)(?![^<]*>)/g, '<a class="underline" href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    return out
  }
}
