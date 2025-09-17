export const runtime = 'edge'

type TextProcessRequest = {
    text: string
    operation: 'optimize' | 'expand' | 'summarize' | 'rewrite' | 'continue'
    prompt?: string
    tone?: string
}

type TextProcessResponse = {
    success: boolean
    data?: {
        processedText: string
        suggestions: string[]
        operation: string
    }
    error?: string
}

export async function POST(req: Request): Promise<Response> {
    try {
        const { text, operation, prompt, tone }: TextProcessRequest = await req.json()

        // 验证输入
        if (!text || typeof text !== 'string') {
            return Response.json({
                success: false,
                error: '文本内容是必需的'
            }, { status: 400 })
        }

        if (text.length > 5000) {
            return Response.json({
                success: false,
                error: '文本长度不能超过5000字符'
            }, { status: 400 })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            // 返回模拟数据
            const mockData = generateMockResult(text, operation, prompt, tone)
            return Response.json({
                success: true,
                data: mockData
            })
        }

        // 构建提示词
        const systemPrompt = buildSystemPrompt(operation)
        const userPrompt = buildUserPrompt(text, operation, prompt, tone)

        // 调用OpenAI API
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
                max_tokens: 2000
            })
        })

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || ''

        // 解析AI返回的内容
        const processedData = parseTextProcessResponse(content, operation)

        return Response.json({
            success: true,
            data: processedData
        })

    } catch (error) {
        console.error('Text process error:', error)
        return Response.json({
            success: false,
            error: '文本处理时发生错误，请稍后再试'
        }, { status: 500 })
    }
}

function buildSystemPrompt(operation: string): string {
    const prompts = {
        optimize: '你是一个专业的文本优化专家，擅长改进文本的表达方式、逻辑结构和可读性。请保持原文的核心意思不变，但让表达更加清晰、流畅和有力。',
        expand: '你是一个内容扩展专家，擅长在保持原文核心观点的基础上，增加细节、例子、解释和深度分析。请让内容更加丰富和深入。',
        summarize: '你是一个摘要专家，擅长提取文本的核心要点，生成简洁而全面的摘要。请保持原文的关键信息，但用更简洁的方式表达。',
        rewrite: '你是一个重写专家，擅长用不同的表达方式重新组织文本内容。请保持原文的意思，但用全新的语言和结构来表达。',
        continue: '你是一个续写专家，擅长基于现有内容进行自然的续写和补写。请保持与原文风格和逻辑的一致性，自然地扩展内容。'
    }
    
    return prompts[operation as keyof typeof prompts] || prompts.optimize
}

function buildUserPrompt(text: string, operation: string, prompt?: string, tone?: string): string {
    let userPrompt = `请处理以下文本：\n\n${text}\n\n`
    
    if (prompt) {
        userPrompt += `具体要求：${prompt}\n\n`
    }
    
    if (tone) {
        userPrompt += `语言风格：${tone}\n\n`
    }
    
    const operationInstructions = {
        optimize: '请优化这段文本，提升其表达效果、逻辑性和可读性。',
        expand: '请扩展这段文本，增加更多细节、例子和深入分析。',
        summarize: '请为这段文本生成简洁的摘要，保留核心要点。',
        rewrite: '请重写这段文本，用不同的表达方式重新组织内容。',
        continue: '请基于这段文本进行续写，自然地扩展内容。'
    }
    
    userPrompt += operationInstructions[operation as keyof typeof operationInstructions] || operationInstructions.optimize
    
    userPrompt += '\n\n请直接返回处理后的文本，不要添加任何解释或说明。'
    
    return userPrompt
}

function parseTextProcessResponse(content: string, operation: string) {
    // 清理内容，移除可能的格式标记
    let processedText = content.trim()
    
    // 移除常见的AI回复格式
    processedText = processedText.replace(/^(处理后的文本|优化后的文本|扩展后的文本|摘要|重写后的文本|续写内容)[:：]\s*/i, '')
    processedText = processedText.replace(/^(以下是|这是)[:：]\s*/i, '')
    
    // 生成建议
    const suggestions = generateSuggestions(operation, processedText)
    
    return {
        processedText,
        suggestions,
        operation
    }
}

function generateSuggestions(operation: string, text: string): string[] {
    const baseSuggestions = {
        optimize: [
            '检查语法和拼写错误',
            '确保逻辑清晰连贯',
            '考虑添加过渡词连接段落'
        ],
        expand: [
            '可以添加更多具体例子',
            '考虑增加数据支撑',
            '可以添加对比分析'
        ],
        summarize: [
            '确保包含所有关键信息',
            '保持摘要的客观性',
            '检查是否遗漏重要细节'
        ],
        rewrite: [
            '确保新表达保持原意',
            '检查语言风格是否一致',
            '验证逻辑结构是否清晰'
        ],
        continue: [
            '确保与原文风格一致',
            '检查逻辑是否连贯',
            '考虑是否需要过渡句'
        ]
    }
    
    return baseSuggestions[operation as keyof typeof baseSuggestions] || baseSuggestions.optimize
}

function generateMockResult(text: string, operation: string, prompt?: string, tone?: string) {
    const mockResults = {
        optimize: `经过优化的文本：${text}。这段文本现在表达更加清晰，逻辑更加严密，语言更加流畅。`,
        expand: `${text} 在此基础上，我们可以进一步深入分析。通过详细的研究和案例分析，我们发现这一现象具有更深层次的原因和影响。具体来说，这种趋势不仅反映了当前的社会变化，也预示着未来的发展方向。`,
        summarize: `核心要点：${text.substring(0, Math.min(100, text.length))}...`,
        rewrite: `重新表达：${text}。从另一个角度来看，这个问题涉及多个层面的因素，需要我们综合考虑各种可能性。`,
        continue: `${text} 继续深入探讨，我们发现这一主题还有许多值得研究的方向。特别是在实际应用中，这些理论和方法都展现出了独特的价值和意义。`
    }
    
    return {
        processedText: mockResults[operation as keyof typeof mockResults] || mockResults.optimize,
        suggestions: generateSuggestions(operation, text),
        operation
    }
}