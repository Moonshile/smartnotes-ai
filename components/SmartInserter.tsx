"use client"

import { useState, useEffect } from 'react'
import { FormatAnalyzer, analyzeTextStructure, formatTextForInsertion } from '@/utils/formatAnalyzer'

interface FormatAnalysis {
    headingStyle: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    paragraphStyle: 'normal' | 'quote' | 'code'
    listStyle: 'bullet' | 'numbered' | 'none'
    emphasisStyle: 'bold' | 'italic' | 'underline'
    spacing: 'tight' | 'normal' | 'loose'
}

interface SmartInserterProps {
    content: string
    onInsert: (formattedContent: string) => void
    onClose: () => void
    currentDocument?: string
}

export default function SmartInserter({ content, onInsert, onClose, currentDocument = '' }: SmartInserterProps) {
    const [formatAnalysis, setFormatAnalysis] = useState<FormatAnalysis | null>(null)
    const [preview, setPreview] = useState('')
    const [customFormat, setCustomFormat] = useState<Partial<FormatAnalysis>>({})
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (currentDocument) {
            setLoading(true)
            try {
                const analysis = FormatAnalyzer.analyzeDocument(currentDocument)
                setFormatAnalysis(analysis)
                setCustomFormat(analysis)
            } catch (error) {
                console.warn('Failed to analyze document format:', error)
                setFormatAnalysis({
                    headingStyle: 'h2',
                    paragraphStyle: 'normal',
                    listStyle: 'bullet',
                    emphasisStyle: 'bold',
                    spacing: 'normal'
                })
            } finally {
                setLoading(false)
            }
        }
    }, [currentDocument])

    useEffect(() => {
        if (formatAnalysis) {
            const finalFormat = { ...formatAnalysis, ...customFormat }
            const formatted = formatTextForInsertion(content, finalFormat)
            setPreview(formatted)
        }
    }, [content, formatAnalysis, customFormat])

    const handleInsert = () => {
        if (formatAnalysis) {
            const finalFormat = { ...formatAnalysis, ...customFormat }
            const formatted = formatTextForInsertion(content, finalFormat)
            onInsert(formatted)
            onClose()
        }
    }

    const handleFormatChange = (key: keyof FormatAnalysis, value: any) => {
        setCustomFormat(prev => ({ ...prev, [key]: value }))
    }

    const resetFormat = () => {
        if (formatAnalysis) {
            setCustomFormat(formatAnalysis)
        }
    }

    const structure = analyzeTextStructure(content)

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">智能文本插入</h2>
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
                    <div className="space-y-6">
                        {/* 文本结构分析 */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">文本结构分析</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className={`p-3 rounded-md border ${structure.isList ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="text-sm font-medium">列表</div>
                                    <div className="text-xs text-gray-600">{structure.isList ? '是' : '否'}</div>
                                </div>
                                <div className={`p-3 rounded-md border ${structure.isNumberedList ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="text-sm font-medium">编号列表</div>
                                    <div className="text-xs text-gray-600">{structure.isNumberedList ? '是' : '否'}</div>
                                </div>
                                <div className={`p-3 rounded-md border ${structure.isCode ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="text-sm font-medium">代码</div>
                                    <div className="text-xs text-gray-600">{structure.isCode ? '是' : '否'}</div>
                                </div>
                                <div className={`p-3 rounded-md border ${structure.isQuote ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="text-sm font-medium">引用</div>
                                    <div className="text-xs text-gray-600">{structure.isQuote ? '是' : '否'}</div>
                                </div>
                            </div>
                        </div>

                        {/* 格式设置 */}
                        {formatAnalysis && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3">格式设置</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            标题样式
                                        </label>
                                        <select
                                            value={customFormat.headingStyle || formatAnalysis.headingStyle}
                                            onChange={(e) => handleFormatChange('headingStyle', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="h1">H1 - 主标题</option>
                                            <option value="h2">H2 - 二级标题</option>
                                            <option value="h3">H3 - 三级标题</option>
                                            <option value="h4">H4 - 四级标题</option>
                                            <option value="h5">H5 - 五级标题</option>
                                            <option value="h6">H6 - 六级标题</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            段落样式
                                        </label>
                                        <select
                                            value={customFormat.paragraphStyle || formatAnalysis.paragraphStyle}
                                            onChange={(e) => handleFormatChange('paragraphStyle', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="normal">普通段落</option>
                                            <option value="quote">引用块</option>
                                            <option value="code">代码块</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            列表样式
                                        </label>
                                        <select
                                            value={customFormat.listStyle || formatAnalysis.listStyle}
                                            onChange={(e) => handleFormatChange('listStyle', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="bullet">项目符号</option>
                                            <option value="numbered">编号列表</option>
                                            <option value="none">无列表</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            强调样式
                                        </label>
                                        <select
                                            value={customFormat.emphasisStyle || formatAnalysis.emphasisStyle}
                                            onChange={(e) => handleFormatChange('emphasisStyle', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="bold">粗体</option>
                                            <option value="italic">斜体</option>
                                            <option value="underline">下划线</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={resetFormat}
                                        className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        重置为文档格式
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 预览 */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3">预览效果</h3>
                            <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                                {loading ? (
                                    <div className="text-center text-gray-500">分析文档格式中...</div>
                                ) : (
                                    <div
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: preview }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleInsert}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                插入文本
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
