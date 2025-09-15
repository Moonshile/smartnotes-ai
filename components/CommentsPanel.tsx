"use client"
import * as Y from 'yjs'
import { useEffect, useMemo, useState } from 'react'

type CommentItem = {
  id: string
  from: number
  to: number
  author: string
  role: 'user' | 'ai'
  text: string
  suggestion?: string
  status: 'open' | 'applied' | 'rejected'
}

export default function CommentsPanel({ ydoc, onApply, onReject }: { ydoc?: Y.Doc | null; onApply: (c: CommentItem) => void; onReject: (c: CommentItem) => void }) {
  const [tick, setTick] = useState(0)
  const comments = useMemo<CommentItem[]>(() => {
    if (!ydoc) return []
    const arr = ydoc.getArray<any>('comments')
    return (arr.toArray() as any[]).filter(Boolean) as CommentItem[]
  }, [ydoc, tick])

  useEffect(() => {
    if (!ydoc) return
    const arr = ydoc.getArray('comments')
    const sub = () => setTick((t) => t + 1)
    arr.observe(sub)
    return () => arr.unobserve(sub)
  }, [ydoc])

  if (!ydoc) return null
  if (comments.length === 0) return (
    <div className="border-t px-3 py-2 text-xs text-slate-500">No suggestions yet.</div>
  )
  return (
    <div className="border-t divide-y">
      {comments.map((c) => (
        <div key={c.id} className="px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-slate-600">
              <span className="font-medium">{c.role === 'ai' ? 'AI' : c.author}</span>
              <span className="ml-2 text-xs rounded bg-slate-100 px-2 py-0.5">{c.status}</span>
            </div>
          </div>
          <div className="mt-1 text-slate-800">{c.text}</div>
          {c.suggestion && (
            <div className="mt-1 text-slate-700"><span className="text-xs text-slate-500">Suggestion:</span> {c.suggestion}</div>
          )}
          {c.status === 'open' && (
            <div className="mt-2 flex gap-2">
              <button className="text-xs rounded bg-black text-white px-2 py-1" onClick={() => onApply(c)}>Apply</button>
              <button className="text-xs rounded border px-2 py-1" onClick={() => onReject(c)}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function addSuggestion(ydoc: Y.Doc, c: CommentItem) {
  const arr = ydoc.getArray('comments')
  arr.push([{ ...c }])
}

export function updateComment(ydoc: Y.Doc, id: string, patch: Partial<CommentItem>) {
  const arr = ydoc.getArray<any>('comments')
  const list = arr.toArray()
  const idx = list.findIndex((x: any) => x?.id === id)
  if (idx >= 0) {
    const next = { ...list[idx], ...patch }
    arr.delete(idx, 1)
    arr.insert(idx, [next])
  }
}

