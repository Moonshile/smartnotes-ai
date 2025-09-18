export const runtime = 'edge'

type TextProcessRequest = {
    text: string
    operation: 'optimize' | 'expand' | 'summarize' | 'rewrite' | 'continue'
    prompt?: string
    tone?: string
    currentResult?: string
    context?: string
    searchResults?: any[]
}

export async function POST(req: Request): Promise<Response> {
    try {
        const { text, operation, prompt, tone, currentResult, context, searchResults }: TextProcessRequest = await req.json()

        // 验证输入
        if (!text || typeof text !== 'string') {
            return new Response('data: {"type":"error","message":"文本内容是必需的"}\n\n', {
                headers: { 'Content-Type': 'text/event-stream' }
            })
        }

        if (text.length > 10000) {
            return new Response('data: {"type":"error","message":"文本长度不能超过10000字符"}\n\n', {
                headers: { 'Content-Type': 'text/event-stream' }
            })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return new Response('data: {"type":"error","message":"API密钥未配置"}\n\n', {
                headers: { 'Content-Type': 'text/event-stream' }
            })
        }

        // 构建系统提示词
        const systemPrompt = buildSystemPrompt(operation)
        const userPrompt = currentResult
            ? buildIterationPrompt(text, operation, prompt, tone, currentResult, context, searchResults)
            : buildUserPrompt(text, operation, prompt, tone, context, searchResults)

        // 调用OpenAI API，使用流式响应
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000,
                stream: true
            })
        })

        if (!response.ok) {
            return new Response(`data: {"type":"error","message":"AI处理失败，请稍后再试"}\n\n`, {
                headers: { 'Content-Type': 'text/event-stream' }
            })
        }

        // 创建流式响应
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body!.getReader()
                const decoder = new TextDecoder()
                let buffer = ''
                let fullContent = ''
                let suggestions: string[] = []

                try {
                    while (true) {
                        const { value, done } = await reader.read()
                        if (done) break

                        buffer += decoder.decode(value, { stream: true })
                        const lines = buffer.split('\n')
                        buffer = lines.pop() || ''

                        for (const line of lines) {
                            const trimmed = line.trim()
                            if (!trimmed.startsWith('data:')) continue
                            
                            const data = trimmed.slice(5).trim()
                            if (data === '[DONE]') {
                                // 发送最终结果
                                const finalResult = parseTextProcessResponse(fullContent, operation)
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    type: 'complete',
                                    data: finalResult
                                })}\n\n`))
                                controller.close()
                                return
                            }

                            try {
                                const parsed = JSON.parse(data)
                                const content = parsed.choices?.[0]?.delta?.content
                                if (content) {
                                    fullContent += content
                                    // 发送增量内容
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                        type: 'content',
                                        content: content
                                    })}\n\n`))
                                }
                            } catch (e) {
                                // 忽略解析错误
                            }
                        }
                    }
                } catch (error) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'error',
                        message: '处理过程中发生错误'
                    })}\n\n`))
                    controller.close()
                } finally {
                    reader.releaseLock()
                }
            }
        })

        return new Response(stream, {
            headers: { 'Content-Type': 'text/event-stream' }
        })

    } catch (error) {
        console.error('Text process stream error:', error)
        return new Response('data: {"type":"error","message":"服务器内部错误"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' }
        })
    }
}

function buildSystemPrompt(operation: string): string {
    const basePrompt = '你是一个专业的文本处理助手，擅长优化、扩展、总结、重写和续写文本内容。'
    
    switch (operation) {
        case 'optimize':
            return basePrompt + '请优化文本的表达，使其更加清晰、流畅、有逻辑性。'
        case 'expand':
            return basePrompt + '请扩展文本内容，添加更多细节和深度，使内容更加丰富。'
        case 'summarize':
            return basePrompt + '请总结文本的核心要点，保持简洁明了。'
        case 'rewrite':
            return basePrompt + '请重写文本，保持原意但改变表达方式。'
        case 'continue':
            return basePrompt + '请续写文本，保持风格和逻辑的连贯性。'
        default:
            return basePrompt
    }
}

function buildUserPrompt(text: string, operation: string, prompt?: string, tone?: string, context?: string, searchResults?: any[]): string {
    let userPrompt = `请对以下文本进行${operation}处理：\n\n${text}`
    
    if (prompt) {
        userPrompt += `\n\n具体要求：${prompt}`
    }
    
    if (tone) {
        userPrompt += `\n\n语调风格：${tone}`
    }
    
    if (context) {
        userPrompt += `\n\n文档上下文：${context}`
    }
    
    if (searchResults && searchResults.length > 0) {
        userPrompt += `\n\n参考资料：\n${searchResults.map(r => `- ${r.title}: ${r.summary}`).join('\n')}`
    }
    
    userPrompt += '\n\n请直接返回处理后的文本内容，不要包含任何HTML标签或其他格式标记。'
    
    return userPrompt
}

function buildIterationPrompt(text: string, operation: string, prompt?: string, tone?: string, currentResult?: string, context?: string, searchResults?: any[]): string {
    let userPrompt = `请根据以下优化建议，对当前结果进行改进：\n\n`
    userPrompt += `原始文本：${text}\n\n`
    userPrompt += `当前结果：${currentResult}\n\n`
    userPrompt += `优化建议：${prompt || '请进一步优化'}\n\n`
    
    if (context) {
        userPrompt += `文档上下文：${context}\n\n`
    }
    
    if (searchResults && searchResults.length > 0) {
        userPrompt += `参考资料：\n${searchResults.map(r => `- ${r.title}: ${r.summary}`).join('\n')}\n\n`
    }
    
    userPrompt += '请直接返回改进后的文本内容，不要包含任何HTML标签或其他格式标记。'
    
    return userPrompt
}

function parseTextProcessResponse(content: string, operation: string): { processedText: string; suggestions: string[]; operation: string } {
    // 清理内容
    let processedText = content.trim()
    
    // 移除HTML标签
    processedText = processedText.replace(/<[^>]*>/g, '')
    
    // 清理多余的空行
    processedText = processedText.replace(/\n\s*\n/g, '\n').trim()
    
    // 生成建议
    const suggestions = generateSuggestions(operation, processedText)
    
    return {
        processedText,
        suggestions,
        operation
    }
}

function generateSuggestions(operation: string, processedText: string): string[] {
    const suggestions: string[] = []
    
    switch (operation) {
        case 'optimize':
            suggestions.push('可以进一步优化逻辑结构')
            suggestions.push('可以增加更多具体例子')
            break
        case 'expand':
            suggestions.push('可以添加更多细节描述')
            suggestions.push('可以增加相关背景信息')
            break
        case 'summarize':
            suggestions.push('可以进一步精简内容')
            suggestions.push('可以突出关键要点')
            break
        case 'rewrite':
            suggestions.push('可以尝试不同的表达方式')
            suggestions.push('可以调整段落结构')
            break
        case 'continue':
            suggestions.push('可以继续扩展相关内容')
            suggestions.push('可以添加结论或总结')
            break
    }
    
    return suggestions
}
