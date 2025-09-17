"use client"
import React, { useEffect, useImperativeHandle, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import OutlineGenerator from './OutlineGenerator'
import SmartTextProcessor from './SmartTextProcessor'
import ResearchPanel from './ResearchPanel'
import SmartInserter from './SmartInserter'


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

    // 新功能状态
    const [showOutlineGenerator, setShowOutlineGenerator] = useState(false)
    const [showSmartTextProcessor, setShowSmartTextProcessor] = useState(false)
    const [showResearchPanel, setShowResearchPanel] = useState(false)
    const [showSmartInserter, setShowSmartInserter] = useState(false)
    const [selectedText, setSelectedText] = useState('')
    const [smartInsertContent, setSmartInsertContent] = useState('')


    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                codeBlock: {},
            }),
            Link.configure({ openOnClick: false }),
            Placeholder.configure({ placeholder: 'Write your notes here…' }),
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            // Collaboration on content is temporarily disabled to keep document stable.
        ],
        content: value || '<p><br></p>',
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

                // 处理快捷键
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
                    // Cmd/Ctrl + Z 撤销
                    event.preventDefault()
                    editor?.chain().focus().undo().run()
                    return true
                }
                if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') ||
                    ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'z')) {
                    // Cmd/Ctrl + Y 或 Cmd/Ctrl + Shift + Z 重做
                    event.preventDefault()
                    editor?.chain().focus().redo().run()
                    return true
                }
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
                    // Cmd/Ctrl + B 加粗
                    event.preventDefault()
                    editor?.chain().focus().toggleBold().run()
                    return true
                }
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i') {
                    // Cmd/Ctrl + I 斜体
                    event.preventDefault()
                    editor?.chain().focus().toggleItalic().run()
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

                    ; (async () => {
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
                <div className="px-4 py-3">
                    {/* 第一行：文本格式工具 */}
                    <div className="flex items-center gap-1 mb-3">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            <ToolbarBtn onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                </svg>
                            </ToolbarBtn>
                            <ToolbarBtn onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </ToolbarBtn>
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M5 4a1 1 0 011-1h5.5a2.5 2.5 0 011.5 4.5A2.5 2.5 0 0111.5 12H6a1 1 0 01-1-1V4zM6 3a2 2 0 00-2 2v6a2 2 0 002 2h5.5a3.5 3.5 0 100-7H6z" />
                                </svg>
                            </ToolbarBtn>
                            <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M8 3a1 1 0 000 2h1.5l-3 8H5a1 1 0 100 2h4a1 1 0 100-2H7.5l3-8H12a1 1 0 100-2H8z" />
                                </svg>
                            </ToolbarBtn>
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                            </ToolbarBtn>
                            <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                            </ToolbarBtn>
                            <ToolbarBtn onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </ToolbarBtn>
                        </div>

                        {/* 分隔线 */}
                        <div className="flex-1 mx-4">
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                        </div>

                        {/* 快捷提示 */}
                        <div className="hidden lg:block text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                            💡 Cmd/Ctrl+Z 撤销，Cmd/Ctrl+Y 重做，Cmd/Ctrl+B 加粗，Cmd/Ctrl+I 斜体
                        </div>
                    </div>

                    {/* 第二行：AI功能工具 */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-medium text-gray-700 mr-2">AI 助手</span>
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    title="生成文章大纲"
                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium shadow-sm hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center gap-1.5"
                                    onClick={() => setShowOutlineGenerator(true)}
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                    大纲生成
                                </button>

                                <button
                                    type="button"
                                    title="智能文本处理"
                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium shadow-sm hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-1.5"
                                    onClick={() => {
                                        if (!editor) return
                                        const sel = editor.state.selection
                                        if (sel.empty) { alert('请先选择要处理的文本'); return }
                                        const raw = editor.state.doc.textBetween(sel.from, sel.to, '\n')
                                        setSelectedText(raw)
                                        setShowSmartTextProcessor(true)
                                    }}
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    智能处理
                                </button>

                                <button
                                    type="button"
                                    title="检索相关资料"
                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium shadow-sm hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center gap-1.5"
                                    onClick={() => {
                                        if (!editor) return
                                        const sel = editor.state.selection
                                        if (sel.empty) { alert('请先选择要检索的文本'); return }
                                        const raw = editor.state.doc.textBetween(sel.from, sel.to, '\n')
                                        setSelectedText(raw)
                                        setShowResearchPanel(true)
                                    }}
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                    资料检索
                                </button>

                                <button
                                    type="button"
                                    title="AI评论建议"
                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium shadow-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-1.5"
                                    onClick={async () => {
                                        if (!editor) return
                                        const sel = editor.state.selection
                                        if (sel.empty) { alert('请先选择要评论的文本'); return }
                                        const raw = editor.state.doc.textBetween(sel.from, sel.to, '\n')
                                        try {
                                            const res = await fetch('/api/ai/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: raw }) })
                                            const json = await res.json().catch(() => ({} as any))
                                            const suggestion: string = json.suggestion || ''
                                            const block = `<blockquote><p><em>⭐ AI Comment</em></p><p>${escapeHtml(suggestion).replace(/\n/g, '<br/>')}</p></blockquote>`
                                            editor.chain().focus().insertContentAt(sel.to, block).run()
                                        } catch (e) {
                                            console.error('AI suggest failed', e)
                                        }
                                    }}
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                    </svg>
                                    AI评论
                                </button>
                            </div>
                        </div>

                        {/* 右侧操作按钮 */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={doExport}
                                className="px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                导出
                            </button>
                            <button
                                type="button"
                                onClick={doSave}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg text-white disabled:opacity-50 shadow-sm transition-all duration-200 flex items-center gap-2"
                                style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-from), var(--accent-to))' }}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6a1 1 0 10-2 0v5.586l-1.293-1.293z" />
                                </svg>
                                {saving ? '保存中...' : '保存'}
                            </button>
                            {savedAt && (
                                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                                    已保存 {timeAgo(savedAt)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-6 h-[calc(100%-120px)] overflow-auto scroll-thin">
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

            {/* 新功能模态框 */}
            {showOutlineGenerator && (
                <OutlineGenerator
                    onInsert={(content) => {
                        // 对于大纲生成，替换整个文档内容
                        editor?.chain().focus().setContent(content).run()
                        setShowOutlineGenerator(false)
                    }}
                    onClose={() => setShowOutlineGenerator(false)}
                    currentDocument={value}
                />
            )}

            {showSmartTextProcessor && (
                <SmartTextProcessor
                    selectedText={selectedText}
                    documentContext={value}
                    onProcess={(processedText) => {
                        if (editor) {
                            const sel = editor.state.selection
                            if (!sel.empty) {
                                editor.chain().focus().deleteSelection().insertContent(processedText).run()
                            } else {
                                editor.chain().focus().insertContent(processedText).run()
                            }
                        }
                        setShowSmartTextProcessor(false)
                    }}
                    onClose={() => setShowSmartTextProcessor(false)}
                />
            )}

            {showResearchPanel && (
                <ResearchPanel
                    selectedText={selectedText}
                    onInsert={(content) => {
                        editor?.chain().focus().insertContent(content).run()
                        setShowResearchPanel(false)
                    }}
                    onClose={() => setShowResearchPanel(false)}
                />
            )}

            {showSmartInserter && (
                <SmartInserter
                    content={smartInsertContent}
                    onInsert={(formattedContent) => {
                        editor?.chain().focus().insertContent(formattedContent).run()
                        setShowSmartInserter(false)
                    }}
                    onClose={() => setShowSmartInserter(false)}
                    currentDocument={value}
                />
            )}
        </div>
    )
})

function ToolbarBtn({ onClick, active, disabled, children }: { onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center ${disabled
                ? 'text-gray-400 cursor-not-allowed'
                : active
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
            onClick={onClick}
            disabled={disabled}
        >
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
