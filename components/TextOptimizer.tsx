"use client"

import { useState } from 'react'

interface OptimizationOptions {
    style: 'formal' | 'casual' | 'academic' | 'creative'
    length: 'shorter' | 'same' | 'longer'
    focus: 'clarity' | 'conciseness' | 'engagement' | 'professionalism'
}

interface TextChange {
    type: 'addition' | 'deletion' | 'modification'
    original: string
    modified: string
    reason: string
}

interface OptimizeResult {
    optimizedText: string
    changes: TextChange[]
    suggestions: string[]
}

interface TextOptimizerProps {
    selectedText: string
    onOptimize: (optimizedText: string) => void
    onClose: () => void
}

export default function TextOptimizer({ selectedText, onOptimize, onClose }: TextOptimizerProps) {
    const [options, setOptions] = useState<OptimizationOptions>({
        style: 'formal',
        length: 'same',
        focus: 'clarity'
    })
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<OptimizeResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleOptimize = async () => {
        if (!selectedText.trim()) {
            setError('请选择要优化的文本')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/optimize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: selectedText.trim(),
                    options
                }),
            })

            const data = await response.json()

            if (data.success) {
                setResult(data.data)
            } else {
                setError(data.error || '优化文本失败')
            }
        } catch (err) {
            setError('网络错误，请稍后再试')
        } finally {
            setLoading(false)
        }
    }

    const handleApplyOptimization = () => {
        if (result) {
            onOptimize(result.optimizedText)
            onClose()
        }
    }

    const handleReset = () => {
        setResult(null)
        setError(null)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">文本内容优化</h2>
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

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        写作风格
                                    </label>
                                    <select
                                        value={options.style}
                                        onChange={(e) => setOptions(prev => ({ ...prev, style: e.target.value as any }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="formal">正式</option>
                                        <option value="casual">随意</option>
                                        <option value="academic">学术</option>
                                        <option value="creative">创意</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        文本长度
                                    </label>
                                    <select
                                        value={options.length}
                                        onChange={(e) => setOptions(prev => ({ ...prev, length: e.target.value as any }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="shorter">更简洁</option>
                                        <option value="same">保持原长</option>
                                        <option value="longer">更详细</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        优化重点
                                    </label>
                                    <select
                                        value={options.focus}
                                        onChange={(e) => setOptions(prev => ({ ...prev, focus: e.target.value as any }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="clarity">清晰度</option>
                                        <option value="conciseness">简洁性</option>
                                        <option value="engagement">吸引力</option>
                                        <option value="professionalism">专业性</option>
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
                                    onClick={handleOptimize}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '优化中...' : '开始优化'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-green-50 border border-green-200 rounded-md p-4">
                                <h3 className="text-lg font-medium text-green-800 mb-2">优化完成！</h3>
                                <p className="text-green-700">文本已根据您的要求进行优化</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">原文</h3>
                                    <div className="bg-gray-50 p-4 rounded-md">
                                        <p className="text-gray-700 text-sm leading-relaxed">{selectedText}</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">优化后</h3>
                                    <div className="bg-blue-50 p-4 rounded-md">
                                        <p className="text-gray-700 text-sm leading-relaxed">{result.optimizedText}</p>
                                    </div>
                                </div>
                            </div>

                            {result.changes.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">修改详情</h3>
                                    <div className="space-y-2">
                                        {result.changes.map((change, index) => (
                                            <div key={index} className="border border-gray-200 rounded-md p-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-2">
                                                            <span className={`px-2 py-1 text-xs rounded-full ${change.type === 'addition' ? 'bg-green-100 text-green-800' :
                                                                    change.type === 'deletion' ? 'bg-red-100 text-red-800' :
                                                                        'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                {change.type === 'addition' ? '添加' :
                                                                    change.type === 'deletion' ? '删除' : '修改'}
                                                            </span>
                                                            <span className="text-sm text-gray-600">{change.reason}</span>
                                                        </div>
                                                        <div className="text-sm space-y-1">
                                                            <div>
                                                                <span className="text-gray-500">原文：</span>
                                                                <span className="text-gray-700">{change.original}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">修改：</span>
                                                                <span className="text-gray-700">{change.modified}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result.suggestions.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">进一步建议</h3>
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
                                    重新优化
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleApplyOptimization}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    应用优化
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
