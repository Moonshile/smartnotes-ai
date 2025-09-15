"use client"
import React, { useEffect, useImperativeHandle, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
 

export type EditorProps = {
  value: string
  onChange: (val: string) => void
}

export type EditorApi = {
  insertTextBlock: (text: string) => void
  insertPlainText: (text: string) => void
  insertHTMLBlock: (html: string) => void
}

const Editor = React.forwardRef<EditorApi, EditorProps>(function Editor({ value, onChange }, ref) {
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const [ctxMenu, setCtxMenu] = useState<null | { x: number; y: number; from: number; to: number }>(null)
  

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: {} }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your notes here…' }),
      // Collaboration on content is temporarily disabled to keep document stable.
    ],
    content: value || '<p></p>',
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    autofocus: true,
    editorProps: {
      attributes: { class: 'prose prose-slate max-w-none focus:outline-none' },
      handleKeyDown: (view, event) => {
        // Cmd/Ctrl + S to save
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault()
          doSave()
          return true
        }
        if (event.key !== 'Enter') return false
        const { state } = view
        const { $from } = state.selection
        const parent = $from.parent
        const text = parent.textContent?.trim() || ''
        if (!text.startsWith('/')) return false

        event.preventDefault()
        const parts = text.slice(1).split(/\s+/)
        const cmd = (parts[0] || '').toLowerCase()
        const arg = parts.slice(1).join(' ')

        const sel = state.selection
        const selectedText = sel.empty ? '' : state.doc.textBetween(sel.from, sel.to, '\n')

        ;(async () => {
          // Remove the slash command line
          view.dispatch(state.tr.delete($from.before(), $from.after()))

          let action: 'summarize' | 'rewrite' | 'extract' | null = null
          let tone: string | undefined
          if (cmd === 'summarize') action = 'summarize'
          else if (cmd === 'rewrite') { action = 'rewrite'; tone = arg || 'clear and concise' }
          else if (cmd === 'extract') action = 'extract'

          if (!action) { insertBelow(view, `Unknown command: /${cmd}`); return }

          const baseText = selectedText || stripHTMLSafe(view.dom as HTMLElement) || ''
          if (!baseText) { insertBelow(view, 'Nothing to operate on.'); return }

          try {
            const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, text: baseText, tone }) })
            const json = await res.json().catch(() => ({} as any))
            const out: string = json.result || 'No result.'
            if (action === 'rewrite' && !sel.empty) {
              const { state } = view
              const tr = state.tr.replaceWith(sel.from, sel.to, state.schema.text(out))
              view.dispatch(tr)
              return
            }
            insertBelow(view, out)
          } catch {
            insertBelow(view, 'There was an error running the command.')
          }
        })()

        return true
      },
      handleDOMEvents: {
        contextmenu: (view, event: any) => {
          const target = event.target as HTMLElement
          const quote = target.closest('blockquote') as HTMLElement | null
          if (!quote) return false
          // Heuristic: treat blockquotes with an Insight label as removable insights
          const hasLabel = !!quote.querySelector('em')?.textContent?.toLowerCase().includes('insight')
          if (!hasLabel) return false
          event.preventDefault()
          event.stopPropagation()
          const startPos = (view as any).posAtDOM(quote, 0)
          if (typeof startPos !== 'number') return true
          const $start = view.state.doc.resolve(startPos)
          let depth = $start.depth
          while (depth > 0 && $start.node(depth).type.name !== 'blockquote') depth--
          if ($start.node(depth).type.name !== 'blockquote') return true
          const from = $start.before(depth)
          const to = $start.after(depth)
          setCtxMenu({ x: event.clientX, y: event.clientY, from, to })
          return true
        },
      },
    },
  })


  function doSave() {
    if (!editor) return
    setSaving(true)
    const html = editor.getHTML()
    const ok = doLocalSave(html)
    if (ok) setSavedAt(Date.now())
    setSaving(false)
  }

  function doExport() {
    if (!editor) return
    const html = editor.getHTML()
    const title = extractTitle(html)
    const file = `${safeFileName(title)}.html`
    const full = wrapHTMLDocument(title, html)
    const blob = new Blob([full], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== value) {
      editor.commands.setContent(value, false)
    }
  }, [value, editor])

  useImperativeHandle(ref, () => ({
    insertInsight(id: string, text: string) {
      if (!editor) return
      const trimmed = (text || '').trim()
      const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      const looksLikeList = lines.filter(l => /^(?:[-*•]\s+|\d+[\.)]\s+)/.test(l)).length >= 2
      const header = `<p><em>⭐ AI Insight</em></p>`
      if (looksLikeList) {
        const items = lines.map(l => l.replace(/^(?:[-*•]\s+|\d+[\.)]\s+)/, '').trim()).filter(Boolean).map(t => `<li>${escapeHtml(t)}</li>`).join('')
        const html = `<blockquote data-ai-id="${id}">${header}<ul>${items}</ul></blockquote>`
        editor.chain().focus().insertContent(html).run()
        return
      }
      const html = `<blockquote data-ai-id="${id}">${header}<p>${escapeHtml(trimmed)}</p></blockquote>`
      editor.chain().focus().insertContent(html).run()
    },
    removeInsight(id: string) {
      if (!editor) return
      const view: any = (editor as any).view
      const root = view.dom as HTMLElement
      const el = root.querySelector(`blockquote[data-ai-id="${CSS.escape(id)}"]`) as HTMLElement | null
      if (!el) return
      const pos = view.posAtDOM(el, 0)
      if (typeof pos !== 'number') return
      const $pos = view.state.doc.resolve(pos)
      let depth = $pos.depth
      while (depth > 0 && $pos.node(depth).type.name !== 'blockquote') depth--
      if ($pos.node(depth).type.name !== 'blockquote') return
      const from = $pos.before(depth)
      const to = $pos.after(depth)
      const tr = view.state.tr.delete(from, to)
      view.dispatch(tr)
    },
    insertTextBlock(text: string) {
      if (!editor) return
      const trimmed = (text || '').trim()
      const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      const looksLikeList = lines.filter(l => /^(?:[-*•]\s+|\d+[\.)]\s+)/.test(l)).length >= 2

      const header = `<p><em>⭐ AI Insight</em></p>`
      if (looksLikeList) {
        const items = lines
          .map(l => l.replace(/^(?:[-*•]\s+|\d+[\.)]\s+)/, '').trim())
          .filter(Boolean)
          .map(t => `<li>${escapeHtml(t)}</li>`)
          .join('')
        const html = `<blockquote>${header}<ul>${items}</ul></blockquote>`
        editor.chain().focus().insertContent(html).run()
        return
      }

      const html = `<blockquote>${header}<p>${escapeHtml(trimmed)}</p></blockquote>`
      editor.chain().focus().insertContent(html).run()
    },
    insertPlainText(text: string) {
      if (!editor) return
      const trimmed = (text || '').trim()
      const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      const looksLikeList = lines.filter(l => /^(?:[-*•]\s+|\d+[\.)]\s+)/.test(l)).length >= 2

      if (looksLikeList) {
        const items = lines
          .map(l => l.replace(/^(?:[-*•]\s+|\d+[\.)]\s+)/, '').trim())
          .filter(Boolean)
          .map(text => ({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }))
        editor.chain().focus().insertContent({ type: 'bulletList', content: items }).run()
        return
      }
      editor.chain().focus().insertContent({ type: 'paragraph', content: [{ type: 'text', text: trimmed }] }).run()
    },
    insertHTMLBlock(html: string) {
      if (!editor) return
      const safe = escapeHtml(html).replace(/\n/g, '<br/>')
      editor.chain().focus().insertContent(`<blockquote><p><em>⭐ AI Insight</em></p>${safe}</blockquote>`).run()
    },
  }))

  return (
    <div className="h-full relative" onClick={() => { if (ctxMenu) setCtxMenu(null) }}>
      <div className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
        <div className="flex gap-2 items-center px-3 py-2 text-sm">
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>B</ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>I</ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>• List</ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>Numbered</ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')}>{`</>`}</ToolbarBtn>
          <button
            type="button"
            title="Select text to get an AI comment"
            className="ml-2 px-3 py-1.5 rounded-md text-white shadow-sm cursor-pointer hover:opacity-95 active:opacity-90"
            style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))' }}
            onClick={async () => {
              if (!editor) return
              const sel = editor.state.selection
              if (sel.empty) { alert('Select text to get an AI suggestion.'); return }
              const raw = editor.state.doc.textBetween(sel.from, sel.to, '\n')
              try {
                const res = await fetch('/api/ai/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: raw }) })
                const json = await res.json().catch(() => ({} as any))
                const suggestion: string = json.suggestion || ''
                // Insert a non-destructive comment block below the selection
                const block = `<blockquote><p><em>⭐ AI Comment</em></p><p>${escapeHtml(suggestion).replace(/\n/g, '<br/>')}</p></blockquote>`
                editor.chain().focus().insertContentAt(sel.to, block).run()
              } catch (e) {
                console.error('AI suggest failed', e)
              }
            }}
          >
            AI Comment
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:block text-slate-500">Type /summarize, /rewrite tone, /extract</div>
            <button type="button" onClick={doExport} className="px-3 py-1.5 rounded-md bg-white/80 text-slate-800 border border-white/70 shadow-sm hover:bg-white">Export</button>
            <button type="button" onClick={doSave} disabled={saving} className="px-3 py-1.5 rounded-md text-white disabled:opacity-50 shadow-sm" style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))' }}>{saving ? 'Saving…' : 'Save'}</button>
            {savedAt && (<div className="text-xs text-slate-500">Saved {timeAgo(savedAt)}</div>)}
          </div>
        </div>
      </div>
      <div className="p-6 h-[calc(100%-41px)] overflow-auto scroll-thin">
        <EditorContent editor={editor} />
      </div>
      {ctxMenu && (
        <div
          className="fixed z-50 bg-white/95 border border-slate-200 rounded-md shadow-lg text-sm"
          style={{ top: ctxMenu.y + 4, left: ctxMenu.x + 4 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="block w-full text-left px-3 py-2 hover:bg-slate-100"
            onClick={() => {
              if (!editor) return
              const { state, view } = editor as any
              const { from, to } = ctxMenu
              const tr = state.tr.delete(from, to)
              view.dispatch(tr)
              setCtxMenu(null)
            }}
          >
            Remove AI Insight
          </button>
        </div>
      )}
    </div>
  )
})

function ToolbarBtn({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" className={`px-2 py-1 rounded-md border text-slate-700 shadow-sm transition ${active ? 'bg-slate-200 border-slate-300' : 'bg-white/80 hover:bg-white border-white/70'}`} onClick={onClick}>
      {children}
    </button>
  )
}

function insertBelow(view: any, text: string) {
  const { state } = view
  const { $from } = state.selection
  const pos = $from.after()
  const node = state.schema.nodes.paragraph.create({}, state.schema.text(text))
  const tr = state.tr.insert(pos, node)
  view.dispatch(tr)
}

function stripHTMLSafe(rootEl: HTMLElement): string {
  try {
    const el = document.createElement('div')
    el.innerHTML = rootEl.querySelector('.ProseMirror')?.innerHTML || ''
    return (el.textContent || '').trim()
  } catch {
    return ''
  }
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function doLocalSave(html: string) {
  try {
    localStorage.setItem('doc-html', html)
    return true
  } catch {
    return false
  }
}

function safeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '') || 'note'
}

function extractTitle(html: string): string {
  const container = document.createElement('div')
  container.innerHTML = html
  const h = container.querySelector('h1, h2, h3')
  const heading = (h?.textContent || '').trim()
  if (heading) return heading
  const text = (container.textContent || '').trim()
  if (!text) return 'note'
  return text.split(/[\n\.]/)[0].slice(0, 60) || 'note'
}

function wrapHTMLDocument(title: string, inner: string): string {
  const style = `
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial; color: #0f172a; background: #f8fafc; }
    .container { max-width: 760px; margin: 2rem auto; padding: 0 1rem; }
    .prose { line-height: 1.7; }
    pre { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: .5rem; overflow: auto; }
    code { background: #f1f5f9; padding: .2em .35em; border-radius: .25rem; }
    h1,h2,h3 { line-height: 1.25; }
  `
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${style}</style>
  <meta name="generator" content="smartnotes.ai" />
  <meta name="description" content="Exported note" />
  </head>
<body>
  <div class="container">
    ${inner}
  </div>
</body>
</html>`
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default Editor

/* Removed legacy UploadButton (and PDF helpers) to avoid unused references in build */
/* function UploadButton({ onResult }: { onResult: (html: string) => void }) {
  const [busy, setBusy] = useState(false)
  async function handleFile(file: File) {
    const name = file.name.toLowerCase()
    const is = (ext: string) => name.endsWith(ext)
    // Light client-side handling for text-like files
    if (is('.txt') || is('.md') || is('.html') || is('.htm')) {
      const text = await file.text()
      if (is('.html') || is('.htm')) {
        onResult(text)
      } else {
        const html = text
          .replace(/\r/g, '')
          .split(/\n{2,}/)
          .map((b) => `<p>${escapeHtml(b.trim()).replace(/\n/g, '<br/>')}</p>`) 
          .join('')
        onResult(html || '<p></p>')
      }
      return
    }
    // First: for PDFs try client-side extraction to avoid server quirks
    if (is('.pdf')) {
      try {
        const html = await parsePdfClient(file)
        if (html && html.replace(/<[^>]+>/g, '').trim().length > 0) {
          onResult(html)
          return
        }
      } catch (e) {
        // fall through to server + OCR flow
        console.warn('Client PDF extract failed, falling back', e)
      }
    }

    // Server-side conversion for docx, or pdf fallback
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const json = await res.json()
      const html: string = json.html || ''
      onResult(html)
      return
    }
    const msg = await res.text().catch(() => '')
    // If PDF has no text layer, offer OCR fallback
    if (is('.pdf') && res.status === 422) {
      const proceed = confirm('No text found in PDF. Try OCR (slower)?')
      if (!proceed) throw new Error(msg || 'No extractable text found in file')
      const html = await ocrPdfClient(file)
      onResult(html)
      return
    }
    throw new Error(msg || `Upload failed (${res.status})`)
  }

  return (
    <>
      <label className={`cursor-pointer px-3 py-1.5 rounded-md border bg-white/80 hover:bg-white shadow-sm ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
        {busy ? 'Uploading…' : 'Upload'}
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md,.html"
          className="hidden"
          onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputEl = e.target as HTMLInputElement
            const file = inputEl.files?.[0]
            if (!file) return
            setBusy(true)
            try {
              await handleFile(file)
            } catch (err: any) {
              console.error(err)
              alert(typeof err?.message === 'string' ? err.message : 'Failed to import file')
            } finally {
              setBusy(false)
              if (inputEl) inputEl.value = ''
            }
          }}
        />
      </label>
    </>
  )
} */

/* Removed upload/OCR helpers for now */
/* async function ocrPdfClient(file: File): Promise<string> {
  const pdfjs: any = await import('pdfjs-dist')
  const getDocument = (pdfjs as any).getDocument || (pdfjs as any).default?.getDocument
  if (!getDocument) throw new Error('PDF engine not available')
  const buf = await file.arrayBuffer()
  const task = getDocument({ data: buf, disableWorker: true })
  const pdf = await task.promise
  // Load Tesseract from CDN to avoid bundling Node-targeted code
  const T = await loadTesseractFromCdn()
  const worker = await T.createWorker('eng')
  let out = ''
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: ctx, viewport }).promise
    const res = await worker.recognize(canvas)
    out += (res.data.text || '') + '\n\n'
  }
  await (worker as any).terminate?.()
  const blocks = out.replace(/\r/g, '').split(/\n{2,}/)
  const paras = blocks.map((b) => `<p>${escapeHtml(b.trim()).replace(/\n/g, '<br/>')}</p>`).join('')
  return paras || '<p></p>'
} */

/* async function parsePdfClient(file: File): Promise<string> {
  // Use browser pdf.js without workers to avoid external fetches
  let pdfjs: any
  try {
    pdfjs = await import('pdfjs-dist/build/pdf')
  } catch {
    try {
      pdfjs = await import('pdfjs-dist/build/pdf.mjs')
    } catch {
      pdfjs = await import('pdfjs-dist')
    }
  }
  const getDocument = (pdfjs.getDocument || pdfjs.default?.getDocument)
  const buf = await file.arrayBuffer()
  const task = getDocument({ data: buf, disableWorker: true, useWorkerFetch: false, disableFontFace: true, isEvalSupported: false })
  const pdf = await task.promise
  let lines: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    // Group items by approximate y (line) and sort by x
    const rows: Record<number, Array<{ x: number; s: string }>> = {}
    for (const it of content.items as any[]) {
      const s = typeof it.str === 'string' ? it.str : ''
      if (!s) continue
      const tr = it.transform || [1, 0, 0, 1, 0, 0]
      const y = Math.round(tr[5])
      const x = tr[4] || 0
      if (!rows[y]) rows[y] = []
      rows[y].push({ x, s })
    }
    const ys = Object.keys(rows).map((n) => parseInt(n, 10)).sort((a, b) => b - a)
    for (const y of ys) {
      const row = rows[y].sort((a, b) => a.x - b.x)
      const text = row.map((r) => r.s).join(' ').replace(/\s{2,}/g, ' ').trim()
      if (text) lines.push(text)
    }
    lines.push('')
  }
  const blocks = lines.join('\n').replace(/\r/g, '').split(/\n{2,}/)
  const paras = blocks.map((b) => `<p>${escapeHtml(b.trim()).replace(/\n/g, '<br/>')}</p>`).join('')
  return paras || '<p></p>'
} */

/* async function loadTesseractFromCdn(): Promise<any> {
  const g = globalThis as any
  if (g.Tesseract && typeof g.Tesseract.createWorker === 'function') return g.Tesseract
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/tesseract.js@5.0.4/dist/tesseract.min.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load OCR engine'))
    document.head.appendChild(script)
  })
  const T = (globalThis as any).Tesseract
  if (!T || typeof T.createWorker !== 'function') throw new Error('OCR engine unavailable')
  return T
} */
