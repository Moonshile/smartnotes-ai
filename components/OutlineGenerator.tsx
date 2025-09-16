"use client"

import { useState } from 'react'

interface OutlineItem {
    level: number
    title: string
    description: string
    children?: OutlineItem[]
}

interface OutlineResult {
    outline: OutlineItem[]
    introduction: string
    suggestions: string[]
}

interface OutlineGeneratorProps {
    onInsert: (content: string) => void
    onClose: () => void
}

export default function OutlineGenerator({ onInsert, onClose }: OutlineGeneratorProps) {
    const [title, setTitle] = useState('')
    const [type, setType] = useState<'article' | 'report' | 'essay' | 'blog'>('article')
    const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<OutlineResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleGenerate = async () => {
        if (!title.trim()) {
            setError('请输入标题')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/outline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: title.trim(), type, length }),
            })

            const data = await response.json()

            if (data.success) {
                setResult(data.data)
            } else {
                setError(data.error || '生成大纲失败')
            }
        } catch (err) {
            setError('网络错误，请稍后再试')
        } finally {
            setLoading(false)
        }
    }

    const handleInsertOutline = () => {
        if (!result) return

        const outlineHtml = generateOutlineHtml(result.outline)
        const content = `
      <h1>${title}</h1>
      <div class="outline-section">
        <h2>文章大纲</h2>
        ${outlineHtml}
      </div>
      <div class="introduction-section">
        <h2>开头段落</h2>
        <p>${result.introduction}</p>
      </div>
    `

        onInsert(content)
        onClose()
    }

    const handleInsertIntroduction = () => {
        if (!result) return

        const content = `
      <h1>${title}</h1>
      <p>${result.introduction}</p>
    `

        onInsert(content)
        onClose()
    }

    const generateOutlineHtml = (outline: OutlineItem[]): string => {
        return outline.map(item => {
            const childrenHtml = item.children ? generateOutlineHtml(item.children) : ''
            return `
        <div class="outline-item level-${item.level}">
          <h${item.level + 1}>${item.title}</h${item.level + 1}>
          ${item.description ? `<p class="outline-description">${item.description}</p>` : ''}
          ${childrenHtml}
        </div>
      `
        }).join('')
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">智能大纲生成</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {!result ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    文章标题 *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="请输入文章标题..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    maxLength={200}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        文章类型
                                    </label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="article">文章</option>
                                        <option value="report">报告</option>
                                        <option value="essay">论文</option>
                                        <option value="blog">博客</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        文章长度
                                    </label>
                                    <select
                                        value={length}
                                        onChange={(e) => setLength(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="short">简短 (3-4章节)</option>
                                        <option value="medium">中等 (5-6章节)</option>
                                        <option value="long">详细 (7-8章节)</option>
                                    </select>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                    <p className="text-red-600 text-sm">{error}</p>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || !title.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '生成中...' : '生成大纲'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-green-50 border border-green-200 rounded-md p-4">
                                <h3 className="text-lg font-medium text-green-800 mb-2">生成完成！</h3>
                                <p className="text-green-700">已为标题"{title}"生成大纲和开头段落</p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">文章大纲</h3>
                                <div className="space-y-2">
                                    {result.outline.map((item, index) => (
                                        <OutlineItemComponent key={index} item={item} />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">开头段落</h3>
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <p className="text-gray-700 leading-relaxed">{result.introduction}</p>
                                </div>
                            </div>

                            {result.suggestions.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">写作建议</h3>
                                    <ul className="space-y-1">
                                        {result.suggestions.map((suggestion, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="text-blue-500 mr-2">•</span>
                                                <span className="text-gray-700">{suggestion}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setResult(null)}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    重新生成
                                </button>
                                <button
                                    onClick={handleInsertIntroduction}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                >
                                    仅插入开头
                                </button>
                                <button
                                    onClick={handleInsertOutline}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    插入完整大纲
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function OutlineItemComponent({ item }: { item: OutlineItem }) {
    return (
        <div className={`ml-${(item.level - 1) * 4}`}>
            <div className="flex items-start">
                <span className="text-blue-500 mr-2 mt-1">
                    {item.level === 1 ? '•' : '◦'}
                </span>
                <div>
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                </div>
            </div>
            {item.children && (
                <div className="mt-2 space-y-1">
                    {item.children.map((child, index) => (
                        <OutlineItemComponent key={index} item={child} />
                    ))}
                </div>
            )}
        </div>
    )
}
