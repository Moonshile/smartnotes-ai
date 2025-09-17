"use client"

import { useState, useEffect } from 'react'

interface TextProcessResult {
    processedText: string
    suggestions: string[]
    operation: string
}

interface ChatMessage {
    id: string
    type: 'user' | 'assistant'
    content: string
    timestamp: Date
    result?: TextProcessResult
    userPrompt?: string // 用户输入的优化提示
}

interface SmartTextProcessorProps {
    selectedText: string
    onProcess: (processedText: string) => void
    onClose: () => void
    documentContext?: string // 文档上下文
}

export default function SmartTextProcessor({ selectedText, onProcess, onClose, documentContext = '' }: SmartTextProcessorProps) {
    const [prompt, setPrompt] = useState('')
    const [operation, setOperation] = useState<'optimize' | 'expand' | 'summarize' | 'rewrite' | 'continue'>('optimize')
    const [tone, setTone] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<TextProcessResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [iterationPrompt, setIterationPrompt] = useState('')
    const [isIterating, setIsIterating] = useState(false)
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [currentVersion, setCurrentVersion] = useState<TextProcessResult | null>(null)
    const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [useContext, setUseContext] = useState(true)
    const [useSearch, setUseSearch] = useState(false)
    const [autoSearchQuery, setAutoSearchQuery] = useState('')

    // 根据提示语和操作类型自动推测参数
    useEffect(() => {
        if (prompt || operation) {
            const { suggestedTone, suggestedOperation } = analyzePromptAndText(prompt, selectedText, operation)
            setTone(suggestedTone)
            if (suggestedOperation !== operation && ['optimize', 'expand', 'summarize', 'rewrite', 'continue'].includes(suggestedOperation)) {
                setOperation(suggestedOperation as 'optimize' | 'expand' | 'summarize' | 'rewrite' | 'continue')
            }
        }
    }, [prompt, selectedText, operation])

    const handleProcess = async () => {
        if (!selectedText.trim()) {
            setError('请先选择要处理的文本')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // 如果启用搜索，先自动搜索相关资料
            if (useSearch) {
                await handleAutoSearch()
            }

            const response = await fetch('/api/text-process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: selectedText.trim(),
                    operation,
                    prompt: prompt.trim() || undefined,
                    tone: tone.trim() || undefined,
                    context: useContext ? documentContext : undefined,
                    searchResults: useSearch ? searchResults : undefined
                }),
            })

            const data = await response.json()

            if (data.success) {
                const newResult = data.data
                setResult(newResult)
                setCurrentVersion(newResult)

                // 添加初始处理消息到聊天记录
                const initialMessage: ChatMessage = {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: `已成功${getOperationLabel(operation)}选中文本`,
                    timestamp: new Date(),
                    result: newResult
                }
                setChatMessages([initialMessage])
            } else {
                setError(data.error || '文本处理失败')
            }
        } catch (err) {
            setError('网络错误，请稍后再试')
        } finally {
            setLoading(false)
        }
    }

    const handleInsert = (version?: TextProcessResult) => {
        const targetResult = version || currentVersion
        if (!targetResult) return
        onProcess(targetResult.processedText)
        onClose()
    }

    const handleSelectVersion = (version: TextProcessResult) => {
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

    const generateSearchQuery = async () => {
        try {
            // 构建搜索提示，包含原文和用户要求
            let searchPrompt = `请从以下文本中提取3-5个关键词用于搜索相关资料，关键词应该是最能代表文本核心概念和主题的词汇：\n\n原文内容：\n${selectedText}\n\n`
            
            if (prompt) {
                searchPrompt += `用户处理要求：${prompt}\n\n`
            }
            
            if (documentContext) {
                searchPrompt += `文档上下文：\n${documentContext.substring(0, 500)}...\n\n`
            }
            
            searchPrompt += `请基于原文内容、用户要求和文档上下文，提取最相关的搜索关键词。`

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: selectedText.trim(),
                    operation: 'extract',
                    prompt: searchPrompt
                }),
            })

            const data = await response.json()
            if (data.success) {
                return data.data.extractedText || selectedText.trim()
            }
        } catch (err) {
            console.error('生成搜索关键词失败', err)
        }
        return selectedText.trim()
    }

    const handleAutoSearch = async () => {
        setIsSearching(true)
        setError(null)

        try {
            // 自动生成搜索关键词
            const searchQuery = await generateSearchQuery()
            setAutoSearchQuery(searchQuery)

            const response = await fetch('/api/research', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: searchQuery,
                    maxResults: 5
                }),
            })

            const data = await response.json()

            if (data.success) {
                setSearchResults(data.data.results || [])
            } else {
                setError(data.error || '搜索失败')
            }
        } catch (err) {
            setError('网络错误，请稍后再试')
        } finally {
            setIsSearching(false)
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
            const response = await fetch('/api/text-process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: selectedText.trim(),
                    operation,
                    prompt: iterationPrompt.trim(),
                    tone: tone.trim() || undefined,
                    currentResult: currentVersion.processedText,
                    context: useContext ? documentContext : undefined,
                    searchResults: useSearch ? searchResults : undefined
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
                    content: `已根据您的反馈优化处理结果，主要改进包括：${data.data.suggestions?.join('、') || '表达优化和内容完善'}`,
                    timestamp: new Date(),
                    result: newResult
                }
                setChatMessages(prev => [...prev, assistantMessage])
                setIterationPrompt('')
            } else {
                setError(data.error || '迭代处理失败')
            }
        } catch (err) {
            setError('网络错误，请稍后再试')
        } finally {
            setIsIterating(false)
        }
    }

    const getOperationLabel = (op: string) => {
        const labels = {
            optimize: '优化润色',
            expand: '内容扩展',
            summarize: '摘要简化',
            rewrite: '重写改写',
            continue: '续写补写'
        }
        return labels[op as keyof typeof labels] || op
    }

    const getOperationDescription = (op: string) => {
        const descriptions = {
            optimize: '优化文本表达，提升可读性和逻辑性',
            expand: '在原文基础上扩展内容，增加细节和深度',
            summarize: '提取核心要点，生成简洁摘要',
            rewrite: '保持原意的基础上重新组织表达方式',
            continue: '基于原文内容进行续写和补写'
        }
        return descriptions[op as keyof typeof descriptions] || ''
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">智能文本处理</h2>
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
                                <div className="bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto">
                                    <p className="text-sm text-gray-700">{selectedText}</p>
                                </div>
                            </div>

                            {/* 上下文选择 */}
                            {documentContext && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        文档上下文
                                    </label>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={useContext}
                                                onChange={(e) => setUseContext(e.target.checked)}
                                                className="mr-2"
                                            />
                                            <span className="text-sm text-gray-700">使用文档上下文</span>
                                        </label>
                                    </div>
                                    {useContext && (
                                        <div className="mt-2 bg-blue-50 p-3 rounded-md max-h-24 overflow-y-auto">
                                            <p className="text-xs text-gray-600">
                                                {documentContext.substring(0, 200)}
                                                {documentContext.length > 200 && '...'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 搜索资料功能 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    搜索相关资料
                                </label>
                                <div className="flex items-center space-x-4 mb-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={useSearch}
                                            onChange={(e) => setUseSearch(e.target.checked)}
                                            className="mr-2"
                                        />
                                        <span className="text-sm text-gray-700">自动搜索相关资料</span>
                                    </label>
                                </div>
                                {useSearch && (
                                    <div className="space-y-3">
                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                            <div className="text-sm text-blue-800">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                                                    </svg>
                                                    <span className="font-medium">智能搜索</span>
                                                </div>
                                                <p className="text-xs text-blue-600">
                                                    系统将根据选中文本、您的处理要求和文档上下文自动生成搜索关键词，无需手动输入
                                                </p>
                                            </div>
                                        </div>
                                        {autoSearchQuery && (
                                            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                                <div className="text-sm text-gray-700">
                                                    <span className="font-medium">搜索关键词：</span>
                                                    <span className="text-gray-600">{autoSearchQuery}</span>
                                                </div>
                                            </div>
                                        )}
                                        {searchResults.length > 0 && (
                                            <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                                <div className="text-sm font-medium text-green-800 mb-2">
                                                    找到 {searchResults.length} 条相关资料
                                                </div>
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {searchResults.map((result, index) => (
                                                        <div key={index} className="text-xs text-green-700">
                                                            <div className="font-medium">{result.title}</div>
                                                            <div className="text-gray-600">{result.summary}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    处理方式
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['optimize', 'expand', 'summarize', 'rewrite', 'continue'] as const).map((op) => (
                                        <button
                                            key={op}
                                            type="button"
                                            onClick={() => setOperation(op)}
                                            className={`p-3 text-left rounded-md border-2 transition-colors ${operation === op
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="font-medium">{getOperationLabel(op)}</div>
                                            <div className="text-xs text-gray-500 mt-1">{getOperationDescription(op)}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    处理提示 (可选)
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="请描述您希望如何处理这段文本，例如：'让语言更正式'、'增加具体例子'、'简化表达'等..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                                    maxLength={500}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    提供具体提示可以帮助AI更好地理解您的需求
                                </p>
                            </div>

                            {tone && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        语言风格
                                    </label>
                                    <input
                                        type="text"
                                        value={tone}
                                        onChange={(e) => setTone(e.target.value)}
                                        placeholder="例如：正式、友好、简洁、学术等"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

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
                                    onClick={handleProcess}
                                    disabled={loading || !selectedText.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '处理中...' : `开始${getOperationLabel(operation)}`}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-green-50 border border-green-200 rounded-md p-4">
                                <h3 className="text-lg font-medium text-green-800 mb-2">处理完成！</h3>
                                <p className="text-green-700">已成功{getOperationLabel(result.operation)}选中文本</p>
                            </div>

                            {/* 聊天记录区域 */}
                            <div className="border rounded-lg">
                                <div className="bg-gray-50 px-4 py-2 border-b">
                                    <h3 className="text-lg font-semibold">迭代历史</h3>
                                    <p className="text-sm text-gray-600">查看和选择不同版本的处理结果</p>
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
                                                
                                                {/* 用户消息显示 */}
                                                {message.type === 'user' ? (
                                                    <div className="text-sm">
                                                        {message.userPrompt ? (
                                                            <div>
                                                                <div className="text-xs font-medium mb-1">优化建议：</div>
                                                                <div className="text-xs bg-blue-400 bg-opacity-20 p-2 rounded">
                                                                    {message.userPrompt}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            message.content
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm">{message.content}</div>
                                                )}

                                                {message.result && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <div className="text-xs text-gray-500 mb-2">处理结果预览：</div>
                                                        <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                                                            {message.result.processedText.substring(0, 100)}
                                                            {message.result.processedText.length > 100 && '...'}
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
                                                                    <div className="font-medium mb-1">完整处理结果：</div>
                                                                    <div className="text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                                                        {message.result.processedText}
                                                                    </div>
                                                                </div>
                                                                {message.result.suggestions.length > 0 && (
                                                                    <div className="border-t pt-2 mt-2">
                                                                        <div className="font-medium mb-1">改进建议：</div>
                                                                        <ul className="space-y-1">
                                                                            {message.result.suggestions.map((suggestion, idx) => (
                                                                                <li key={idx} className="text-gray-600">• {suggestion}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                <div className="border-t pt-2 mt-2">
                                                                    <div className="font-medium mb-1">处理方式：</div>
                                                                    <div className="text-gray-600">{getOperationLabel(message.result.operation)}</div>
                                                                </div>
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
                                                                onClick={() => handleInsert(message.result)}
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
                                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentVersion.processedText}</p>
                                    </div>
                                    {currentVersion.suggestions.length > 0 && (
                                        <div className="mt-3">
                                            <h4 className="font-medium mb-2">改进建议：</h4>
                                            <ul className="space-y-1">
                                                {currentVersion.suggestions.map((suggestion, index) => (
                                                    <li key={index} className="flex items-start text-sm">
                                                        <span className="text-blue-500 mr-2">•</span>
                                                        <span className="text-gray-700">{suggestion}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 迭代输入区域 */}
                            <div className="border-t pt-4">
                                <h4 className="text-md font-semibold mb-3">继续优化</h4>

                                {/* 显示当前设置状态 */}
                                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                                    <div className="text-sm text-blue-800">
                                        <div className="flex items-center gap-4">
                                            <span className={`flex items-center gap-1 ${useContext ? 'text-green-600' : 'text-gray-500'}`}>
                                                <div className={`w-2 h-2 rounded-full ${useContext ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                {useContext ? '使用文档上下文' : '未使用文档上下文'}
                                            </span>
                                            <span className={`flex items-center gap-1 ${useSearch ? 'text-green-600' : 'text-gray-500'}`}>
                                                <div className={`w-2 h-2 rounded-full ${useSearch ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                {useSearch ? `智能搜索资料 (${searchResults.length}条)` : '未使用搜索资料'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            优化建议
                                        </label>
                                        <textarea
                                            value={iterationPrompt}
                                            onChange={(e) => setIterationPrompt(e.target.value)}
                                            placeholder="请描述您希望如何改进处理结果，例如：'让语言更生动'、'增加更多细节'、'调整语气'等..."
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
                                    重新处理
                                </button>
                                <button
                                    onClick={() => handleInsert()}
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

// 分析提示语和文本，推测处理参数
function analyzePromptAndText(prompt: string, text: string, currentOperation: string) {
    const combinedText = (prompt + ' ' + text).toLowerCase()

    // 推测操作类型
    let suggestedOperation = currentOperation

    if (prompt.includes('扩展') || prompt.includes('增加') || prompt.includes('补充') || prompt.includes('详细')) {
        suggestedOperation = 'expand'
    } else if (prompt.includes('摘要') || prompt.includes('总结') || prompt.includes('简化') || prompt.includes('概括')) {
        suggestedOperation = 'summarize'
    } else if (prompt.includes('重写') || prompt.includes('改写') || prompt.includes('重新组织')) {
        suggestedOperation = 'rewrite'
    } else if (prompt.includes('续写') || prompt.includes('补写') || prompt.includes('继续') || prompt.includes('接着')) {
        suggestedOperation = 'continue'
    } else if (prompt.includes('优化') || prompt.includes('润色') || prompt.includes('改进')) {
        suggestedOperation = 'optimize'
    }

    // 推测语言风格
    let suggestedTone = ''

    if (combinedText.includes('正式') || combinedText.includes('学术') || combinedText.includes('专业')) {
        suggestedTone = '正式'
    } else if (combinedText.includes('友好') || combinedText.includes('亲切') || combinedText.includes('轻松')) {
        suggestedTone = '友好'
    } else if (combinedText.includes('简洁') || combinedText.includes('简短') || combinedText.includes('精炼')) {
        suggestedTone = '简洁'
    } else if (combinedText.includes('详细') || combinedText.includes('深入') || combinedText.includes('全面')) {
        suggestedTone = '详细'
    } else if (combinedText.includes('幽默') || combinedText.includes('风趣') || combinedText.includes('活泼')) {
        suggestedTone = '幽默'
    }

    return { suggestedTone, suggestedOperation }
}