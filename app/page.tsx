"use client"
import { useEffect, useRef, useState } from 'react'
import ChatSidebar from '@/components/ChatSidebar'
import Editor, { type EditorApi } from '@/components/Editor'

export default function Page() {
  const [doc, setDoc] = useState<string>("<h1>My First Note</h1><p>Start writing…</p>")
  const editorRef = useRef<EditorApi | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastTimer, setToastTimer] = useState<any>(null)

  // simple local persistence
  useEffect(() => {
    const saved = localStorage.getItem('doc-html')
    if (saved) setDoc(saved)
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('doc-html', doc)
    } catch {}
  }, [doc])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer) clearTimeout(toastTimer)
    const t = setTimeout(() => setToast(null), 2000)
    setToastTimer(t)
  }

  return (
    <main className="grid gap-5 items-start" style={{ gridTemplateColumns: '1fr 400px' }}>
      <section className="relative sticky top-4 h-[calc(100vh-140px)] rounded-2xl glass-card accent-border overflow-hidden">
        <Editor ref={editorRef} value={doc} onChange={setDoc} />
        {toast && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="rounded-full bg-white/80 border border-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm">
              {toast}
            </div>
          </div>
        )}
      </section>
      <aside className="sticky top-4 h-[calc(100vh-140px)] rounded-2xl glass-card accent-border overflow-hidden">
        <ChatSidebar
          docHTML={doc}
          onInsert={(text) => {
            editorRef.current?.insertTextBlock(text)
            showToast('Inserted into note')
          }}
        />
      </aside>
    </main>
  )
}
