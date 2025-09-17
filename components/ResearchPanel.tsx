"use client"

import { useState } from 'react'

interface ResearchResult {
    id: string
    title: string
    summary: string
    source: string
    url: string
    relevance: number
    credibility: 'high' | 'medium' | 'low'
}

interface ResearchData {
    results: ResearchResult[]
    query: string
    suggestions: string[]
}

interface ResearchPanelProps {
    selectedText: string
    onInsert: (content: string) => void
    onClose: () => void
}

export default function ResearchPanel({ selectedText, onInsert, onClose }: ResearchPanelProps) {
    const [sources, setSources] = useState<('web' | 'wikipedia' | 'academic')[]>(['wikipedia'])
    const [maxResults, setMaxResults] = useState(5)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ResearchData | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleResearch = async () => {
        if (!selectedText.trim()) {
            setError('请选择要检索的文本')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/research', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: selectedText.trim(),
                    sources,
                    maxResults
                }),
            })

            const data = await response.json()

            if (data.success) {
                setResult(data.data)
            } else {
                setError(data.error || '检索资料失败')
            }
        } catch (err) {
            setError('网络错误，请稍后再试')
        } finally {
            setLoading(false)
        }
    }

    const handleInsertResult = (result: ResearchResult) => {
        const content = `
      <blockquote>
        <p><strong>${result.title}</strong></p>
        <p>${result.summary}</p>
        <p><em>来源：${result.source} | <a href="${result.url}" target="_blank">查看原文</a></em></p>
      </blockquote>
    `
        onInsert(content)
    }

    const handleInsertSummary = () => {
        if (!result) return

        const content = `
      <h3>相关资料总结</h3>
      <p>关于"${result.query}"的相关资料：</p>
      <div class="research-summary">
        ${result.results.map(r => `
          <div class="research-item">
            <h4>${r.title}</h4>
            <p>${r.summary}</p>
            <p class="research-source"><em>来源：${r.source} | 相关度：${Math.round(r.relevance * 100)}%</em></p>
          </div>
        `).join('')}
      </div>
    `

        onInsert(content)
    }

    const handleReset = () => {
        setResult(null)
        setError(null)
    }

    const getCredibilityColor = (credibility: string) => {
        switch (credibility) {
            case 'high': return 'text-green-600 bg-green-100'
            case 'medium': return 'text-yellow-600 bg-yellow-100'
            case 'low': return 'text-red-600 bg-red-100'
            default: return 'text-gray-600 bg-gray-100'
        }
    }

    const getCredibilityText = (credibility: string) => {
        switch (credibility) {
            case 'high': return '高可信度'
            case 'medium': return '中等可信度'
            case 'low': return '低可信度'
            default: return '未知'
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">相关资料检索</h2>
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
                                    选中文本
                                </label>
                                <div className="bg-gray-50 p-4 rounded-md max-h-32 overflow-y-auto">
                                    <p className="text-gray-700 text-sm">{selectedText}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        搜索源
                                    </label>
                                    <div className="space-y-2">
                                        {[
                                            { value: 'wikipedia', label: 'Wikipedia', desc: '百科全书内容' },
                                            { value: 'web', label: '网络搜索', desc: '网络文章和新闻' },
                                            { value: 'academic', label: '学术搜索', desc: '学术论文和研究' }
                                        ].map(source => (
                                            <label key={source.value} className="flex items-start">
                                                <input
                                                    type="checkbox"
                                                    checked={sources.includes(source.value as any)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSources([...sources, source.value as any])
                                                        } else {
                                                            setSources(sources.filter(s => s !== source.value))
                                                        }
                                                    }}
                                                    className="mt-1 mr-3"
                                                />
                                                <div>
                                                    <div className="font-medium text-sm">{source.label}</div>
                                                    <div className="text-xs text-gray-500">{source.desc}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        最大结果数
                                    </label>
                                    <select
                                        value={maxResults}
                                        onChange={(e) => setMaxResults(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={3}>3个结果</option>
                                        <option value={5}>5个结果</option>
                                        <option value={10}>10个结果</option>
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
                                    onClick={handleResearch}
                                    disabled={loading || sources.length === 0}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '检索中...' : '开始检索'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-green-50 border border-green-200 rounded-md p-4">
                                <h3 className="text-lg font-medium text-green-800 mb-2">检索完成！</h3>
                                <p className="text-green-700">找到 {result.results.length} 个相关结果</p>
                            </div>

                            <div className="space-y-4">
                                {result.results.map((item, index) => (
                                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900 flex-1">
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center space-x-2 ml-4">
                                                <span className={`px-2 py-1 text-xs rounded-full ${getCredibilityColor(item.credibility)}`}>
                                                    {getCredibilityText(item.credibility)}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    相关度: {Math.round(item.relevance * 100)}%
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-gray-700 mb-3 leading-relaxed">{item.summary}</p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                <span>来源: {item.source}</span>
                                                <a
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    查看原文 →
                                                </a>
                                            </div>
                                            <button
                                                onClick={() => handleInsertResult(item)}
                                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                            >
                                                插入引用
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {result.suggestions.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">搜索建议</h3>
                                    <ul className="space-y-1">
                                        {result.suggestions.map((suggestion, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="text-blue-500 mr-2 mt-1">•</span>
                                                <span className="text-gray-700 text-sm">{suggestion}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    重新检索
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleInsertSummary}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    插入总结
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
