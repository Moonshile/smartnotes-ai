"use client"

import { useState, useEffect } from 'react'
import { parseMarkdownToHtml, containsMarkdown } from '@/utils/markdownParser'

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

interface ChatMessage {
    id: string
    type: 'user' | 'assistant'
    content: string
    timestamp: Date
    result?: OutlineResult
    userPrompt?: string // 用户输入的优化提示
}

interface OutlineGeneratorProps {
    onInsert: (content: string) => void
    onClose: () => void
    currentDocument?: string
}

export default function OutlineGenerator({ onInsert, onClose, currentDocument = '' }: OutlineGeneratorProps) {
    const [title, setTitle] = useState('')
    const [contentHint, setContentHint] = useState('')
    const [type, setType] = useState<'article' | 'report' | 'essay' | 'blog'>('article')
    const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<OutlineResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [iterationPrompt, setIterationPrompt] = useState('')
    const [isIterating, setIsIterating] = useState(false)
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [currentVersion, setCurrentVersion] = useState<OutlineResult | null>(null)
    const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
    const [isInitialized, setIsInitialized] = useState(false)

    // 从当前文档中提取标题（只在组件初始化时执行一次）
    useEffect(() => {
        if (currentDocument && !isInitialized) {
            const extractedTitle = extractTitleFromDocument(currentDocument)
            if (extractedTitle) {
                setTitle(extractedTitle)
            }
            setIsInitialized(true)
        }
    }, [currentDocument, isInitialized])

    // 自动推测文章类型和长度
    useEffect(() => {
        if (title) {
            const { type: suggestedType, length: suggestedLength } = analyzeTitle(title, contentHint)
            setType(suggestedType)
            setLength(suggestedLength)
        }
    }, [title, contentHint])

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
                body: JSON.stringify({
                    title: title.trim(),
                    type,
                    length,
                    contentHint: contentHint.trim() || undefined
                }),
            })

            const data = await response.json()

            if (data.success) {
                const newResult = data.data
                setResult(newResult)
                setCurrentVersion(newResult)

                // 添加初始生成消息到聊天记录
                const initialMessage: ChatMessage = {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: `已为标题"${title}"生成大纲和开头段落`,
                    timestamp: new Date(),
                    result: newResult
                }
                setChatMessages([initialMessage])
            } else {
                setError(data.error || '生成大纲失败')
            }
        } catch (err) {
            setError('网络错误，请稍后再试')
        } finally {
            setLoading(false)
        }
    }

    const handleIterate = async () => {
        if (!currentVersion || !iterationPrompt.trim()) {
            setError('请输入迭代提示')
            return
        }

        setIsIterating(true)
        setError(null)

        // 添加用户消息到聊天记录
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: `优化建议：${iterationPrompt.trim()}`,
            timestamp: new Date(),
            userPrompt: iterationPrompt.trim()
        }
        setChatMessages(prev => [...prev, userMessage])

        try {
            const response = await fetch('/api/outline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title.trim(),
                    type,
                    length,
                    contentHint: contentHint.trim() || undefined,
                    iterationPrompt: iterationPrompt.trim(),
                    currentOutline: currentVersion.outline,
                    currentIntroduction: currentVersion.introduction
                }),
            })

            const data = await response.json()

            if (data.success) {
                const newResult = data.data
                setCurrentVersion(newResult)

                // 添加AI回复消息到聊天记录
                const assistantMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    type: 'assistant',
                    content: `已根据您的反馈优化大纲，主要改进包括：${data.data.suggestions?.join('、') || '结构优化和内容完善'}`,
                    timestamp: new Date(),
                    result: newResult
                }
                setChatMessages(prev => [...prev, assistantMessage])
                setIterationPrompt('')
            } else {
                setError(data.error || '迭代生成失败')
            }
        } catch (err) {
            setError('网络错误，请稍后再试')
        } finally {
            setIsIterating(false)
        }
    }

    const handleInsertOutline = (version?: OutlineResult) => {
        const targetResult = version || currentVersion
        if (!targetResult) return

        // 生成包含描述文本的完整大纲HTML
        const outlineHtml = generateCompleteOutlineHtml(targetResult.outline, targetResult.introduction)
        onInsert(outlineHtml)
        onClose()
    }

    const handleInsertIntroduction = (version?: OutlineResult) => {
        const targetResult = version || currentVersion
        if (!targetResult) return

        let content = targetResult.introduction

        // 检查是否包含markdown语法，如果包含则解析为HTML
        if (containsMarkdown(content)) {
            content = parseMarkdownToHtml(content)
        } else {
            content = `<p>${content}</p>`
        }

        onInsert(content)
        onClose()
    }

    const handleSelectVersion = (version: OutlineResult) => {
        setCurrentVersion(version)
    }

    const toggleExpanded = (messageId: string) => {
        setExpandedMessages(prev => {
            const newSet = new Set(prev)
            if (newSet.has(messageId)) {
                newSet.delete(messageId)
            } else {
                newSet.add(messageId)
            }
            return newSet
        })
    }

    const generateCompleteOutlineHtml = (outline: OutlineItem[], introduction: string): string => {
        // 首先生成开头段落，支持markdown解析
        let introHtml = introduction
        if (containsMarkdown(introduction)) {
            introHtml = parseMarkdownToHtml(introduction)
        } else {
            introHtml = `<p>${introduction}</p>`
        }

        // 然后生成大纲结构，包含描述文本
        const outlineHtml = outline.map(item => {
            const childrenHtml = item.children && item.children.length > 0
                ? generateOutlineWithDescriptions(item.children)
                : ''

            // 支持markdown解析描述文本
            let descriptionHtml = ''
            if (item.description) {
                if (containsMarkdown(item.description)) {
                    descriptionHtml = `<div class="outline-description">${parseMarkdownToHtml(item.description)}</div>`
                } else {
                    descriptionHtml = `<p class="outline-description">${item.description}</p>`
                }
            }

            return `<h${item.level + 1}>${item.title}</h${item.level + 1}>${descriptionHtml}${childrenHtml}`
        }).join('\n')

        return `${introHtml}\n\n${outlineHtml}`
    }

    const generateOutlineWithDescriptions = (outline: OutlineItem[]): string => {
        return outline.map(item => {
            const childrenHtml = item.children && item.children.length > 0
                ? generateOutlineWithDescriptions(item.children)
                : ''

            // 支持markdown解析描述文本
            let descriptionHtml = ''
            if (item.description) {
                if (containsMarkdown(item.description)) {
                    descriptionHtml = `<div class="outline-description">${parseMarkdownToHtml(item.description)}</div>`
                } else {
                    descriptionHtml = `<p class="outline-description">${item.description}</p>`
                }
            }

            return `<h${item.level + 1}>${item.title}</h${item.level + 1}>${descriptionHtml}${childrenHtml}`
        }).join('\n')
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    内容提示 (可选)
                                </label>
                                <textarea
                                    value={contentHint}
                                    onChange={(e) => setContentHint(e.target.value)}
                                    placeholder="请输入文章的关键内容、观点或要求..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                                    maxLength={500}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    提供内容提示可以帮助生成更精准的大纲
                                </p>
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

                            {/* 聊天记录区域 */}
                            <div className="border rounded-lg">
                                <div className="bg-gray-50 px-4 py-2 border-b">
                                    <h3 className="text-lg font-semibold">迭代历史</h3>
                                    <p className="text-sm text-gray-600">查看和选择不同版本的大纲</p>
                                </div>

                                <div className="max-h-96 overflow-y-auto p-4 space-y-4">
                                    {chatMessages.map((message, index) => (
                                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.type === 'user'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                <div className="text-sm font-medium mb-1">
                                                    {message.type === 'user' ? '您' : 'AI助手'}
                                                </div>
                                                <div className="text-sm">{message.content}</div>

                                                {/* 用户提示展示 */}
                                                {message.type === 'user' && message.userPrompt && (
                                                    <div className="mt-2 pt-2 border-t border-blue-300">
                                                        <div className="text-xs font-medium mb-1">您的优化建议：</div>
                                                        <div className="text-xs bg-blue-400 bg-opacity-20 p-2 rounded">
                                                            {message.userPrompt}
                                                        </div>
                                                    </div>
                                                )}

                                                {message.result && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <div className="text-xs text-gray-500 mb-2">大纲预览：</div>
                                                        <div className="text-xs space-y-1">
                                                            {message.result.outline.slice(0, 3).map((item, idx) => (
                                                                <div key={idx} className="truncate">
                                                                    {item.title}
                                                                </div>
                                                            ))}
                                                            {message.result.outline.length > 3 && (
                                                                <div className="text-gray-400">...等{message.result.outline.length}个章节</div>
                                                            )}
                                                        </div>

                                                        {/* 展开/收起按钮 */}
                                                        <div className="mt-2">
                                                            <button
                                                                onClick={() => toggleExpanded(message.id)}
                                                                className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 mr-2"
                                                            >
                                                                {expandedMessages.has(message.id) ? '收起详情' : '展开详情'}
                                                            </button>
                                                        </div>

                                                        {/* 展开的详细内容 */}
                                                        {expandedMessages.has(message.id) && (
                                                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                                                <div className="mb-2">
                                                                    <div className="font-medium mb-1">完整大纲：</div>
                                                                    <div className="space-y-1">
                                                                        {message.result.outline.map((item, idx) => (
                                                                            <div key={idx} className="ml-2">
                                                                                <div className="font-medium">{item.title}</div>
                                                                                {item.description && (
                                                                                    <div className="text-gray-600 text-xs mt-1">{item.description}</div>
                                                                                )}
                                                                                {item.children && item.children.length > 0 && (
                                                                                    <div className="ml-4 mt-1 space-y-1">
                                                                                        {item.children.map((child, childIdx) => (
                                                                                            <div key={childIdx} className="text-gray-600">
                                                                                                • {child.title}
                                                                                                {child.description && (
                                                                                                    <div className="text-xs text-gray-500 ml-2">{child.description}</div>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="border-t pt-2">
                                                                    <div className="font-medium mb-1">开头段落：</div>
                                                                    <div className="text-gray-600">{message.result.introduction}</div>
                                                                </div>
                                                                {message.result.suggestions.length > 0 && (
                                                                    <div className="border-t pt-2 mt-2">
                                                                        <div className="font-medium mb-1">写作建议：</div>
                                                                        <ul className="space-y-1">
                                                                            {message.result.suggestions.map((suggestion, idx) => (
                                                                                <li key={idx} className="text-gray-600">• {suggestion}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="flex space-x-2 mt-2">
                                                            <button
                                                                onClick={() => handleSelectVersion(message.result!)}
                                                                className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                            >
                                                                选择此版本
                                                            </button>
                                                            <button
                                                                onClick={() => handleInsertOutline(message.result)}
                                                                className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                                            >
                                                                插入此版本
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 当前版本预览 */}
                            {currentVersion && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">当前版本预览</h3>
                                    <div className="bg-gray-50 p-4 rounded-md">
                                        <div className="space-y-2">
                                            {currentVersion.outline.map((item, index) => (
                                                <OutlineItemComponent key={index} item={item} />
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-4 border-t">
                                            <h4 className="font-medium mb-2">开头段落：</h4>
                                            <p className="text-sm text-gray-700">{currentVersion.introduction}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 迭代输入区域 */}
                            <div className="border-t pt-4">
                                <h4 className="text-md font-semibold mb-3">继续优化</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            优化建议
                                        </label>
                                        <textarea
                                            value={iterationPrompt}
                                            onChange={(e) => setIterationPrompt(e.target.value)}
                                            placeholder="请描述您希望如何改进大纲，例如：'增加更多技术细节'、'调整章节顺序'、'添加案例分析'等..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                                            maxLength={500}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleIterate}
                                            disabled={isIterating || !iterationPrompt.trim()}
                                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isIterating ? '优化中...' : '发送优化建议'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setResult(null)
                                        setChatMessages([])
                                        setCurrentVersion(null)
                                    }}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    重新生成
                                </button>
                                <button
                                    onClick={() => handleInsertIntroduction()}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                >
                                    仅插入开头
                                </button>
                                <button
                                    onClick={() => handleInsertOutline()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    插入当前版本
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
            {item.children && item.children.length > 0 && (
                <div className="mt-2 space-y-1">
                    {item.children.map((child, index) => (
                        <OutlineItemComponent key={index} item={child} />
                    ))}
                </div>
            )}
        </div>
    )
}

// 从文档中提取标题
function extractTitleFromDocument(doc: string): string | null {
    // 尝试从HTML中提取第一个h1标题
    const h1Match = doc.match(/<h1[^>]*>(.*?)<\/h1>/i)
    if (h1Match) {
        return h1Match[1].replace(/<[^>]*>/g, '').trim()
    }

    // 尝试从Markdown中提取第一个#标题
    const markdownMatch = doc.match(/^#\s+(.+)$/m)
    if (markdownMatch) {
        return markdownMatch[1].trim()
    }

    // 尝试从纯文本中提取第一行作为标题
    const lines = doc.split('\n').filter(line => line.trim())
    if (lines.length > 0) {
        const firstLine = lines[0].replace(/<[^>]*>/g, '').trim()
        if (firstLine.length > 0 && firstLine.length < 100) {
            return firstLine
        }
    }

    return null
}

// 分析标题和内容提示，推测文章类型和长度
function analyzeTitle(title: string, contentHint: string): { type: 'article' | 'report' | 'essay' | 'blog', length: 'short' | 'medium' | 'long' } {
    const text = (title + ' ' + contentHint).toLowerCase()

    // 推测文章类型
    let type: 'article' | 'report' | 'essay' | 'blog' = 'article'

    if (text.includes('报告') || text.includes('分析') || text.includes('调研') || text.includes('数据')) {
        type = 'report'
    } else if (text.includes('论文') || text.includes('研究') || text.includes('学术') || text.includes('理论')) {
        type = 'essay'
    } else if (text.includes('博客') || text.includes('分享') || text.includes('经验') || text.includes('心得')) {
        type = 'blog'
    }

    // 推测文章长度
    let length: 'short' | 'medium' | 'long' = 'medium'

    if (text.includes('简单') || text.includes('简要') || text.includes('概述') || text.includes('简介')) {
        length = 'short'
    } else if (text.includes('详细') || text.includes('深入') || text.includes('全面') || text.includes('完整') || text.includes('深度')) {
        length = 'long'
    }

    return { type, length }
}