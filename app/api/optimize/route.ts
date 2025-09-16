export const runtime = 'edge'

type OptimizeRequest = {
    text: string
    options: {
        style: 'formal' | 'casual' | 'academic' | 'creative'
        length: 'shorter' | 'same' | 'longer'
        focus: 'clarity' | 'conciseness' | 'engagement' | 'professionalism'
    }
}

type TextChange = {
    type: 'addition' | 'deletion' | 'modification'
    original: string
    modified: string
    reason: string
}

type OptimizeResponse = {
    success: boolean
    data?: {
        optimizedText: string
        changes: TextChange[]
        suggestions: string[]
    }
    error?: string
}

export async function POST(req: Request): Promise<Response> {
    try {
        const { text, options }: OptimizeRequest = await req.json()

        // 验证输入
        if (!text || typeof text !== 'string') {
            return Response.json({
                success: false,
                error: '文本内容是必需的'
            }, { status: 400 })
        }

        if (text.length > 10000) {
            return Response.json({
                success: false,
                error: '文本长度不能超过10000字符'
            }, { status: 400 })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            // 返回模拟数据
            const mockData = generateMockOptimization(text, options)
            return Response.json({
                success: true,
                data: mockData
            })
        }

        // 构建提示词
        const prompt = buildOptimizePrompt(text, options)

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
                        content: '你是一个专业的文本优化助手，能够根据用户要求优化文本内容，提升可读性和表达效果。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.2,
                max_tokens: 2000
            })
        })

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || ''

        // 解析AI返回的内容
        const parsedData = parseOptimizeResponse(content, text, options)

        return Response.json({
            success: true,
            data: parsedData
        })

    } catch (error) {
        console.error('Text optimization error:', error)
        return Response.json({
            success: false,
            error: '优化文本时发生错误，请稍后再试'
        }, { status: 500 })
    }
}

function buildOptimizePrompt(text: string, options: OptimizeRequest['options']): string {
    const styleMap = {
        formal: '正式',
        casual: '随意',
        academic: '学术',
        creative: '创意'
    }

    const lengthMap = {
        shorter: '更简洁',
        same: '保持原有长度',
        longer: '更详细'
    }

    const focusMap = {
        clarity: '清晰度',
        conciseness: '简洁性',
        engagement: '吸引力',
        professionalism: '专业性'
    }

    return `请优化以下文本内容：

优化要求：
- 风格：${styleMap[options.style]}
- 长度：${lengthMap[options.length]}
- 重点：${focusMap[options.focus]}

原文：
${text}

请以以下JSON格式返回优化结果：
{
  "optimizedText": "优化后的文本内容",
  "changes": [
    {
      "type": "modification",
      "original": "原文片段",
      "modified": "修改后片段",
      "reason": "修改原因"
    }
  ],
  "suggestions": [
    "进一步优化建议1",
    "进一步优化建议2"
  ]
}`
}

function parseOptimizeResponse(content: string, originalText: string, options: OptimizeRequest['options']) {
    try {
        // 尝试解析JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            return {
                optimizedText: parsed.optimizedText || originalText,
                changes: parsed.changes || [],
                suggestions: parsed.suggestions || []
            }
        }
    } catch (error) {
        console.warn('Failed to parse JSON response:', error)
    }

    // 如果JSON解析失败，使用文本解析
    return parseTextOptimizeResponse(content, originalText, options)
}

function parseTextOptimizeResponse(content: string, originalText: string, options: OptimizeRequest['options']) {
    // 简单的文本解析，提取优化后的文本
    const lines = content.split('\n').filter(line => line.trim())

    let optimizedText = originalText
    const changes: TextChange[] = []
    const suggestions: string[] = []

    // 查找优化后的文本
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.includes('优化后') || line.includes('修改后') || line.includes('改进后')) {
            // 尝试提取优化后的文本
            const nextLines = lines.slice(i + 1).filter(l => l.trim() && !l.includes('建议') && !l.includes('修改'))
            if (nextLines.length > 0) {
                optimizedText = nextLines.join(' ').trim()
                break
            }
        }
    }

    // 生成基本的修改记录
    if (optimizedText !== originalText) {
        changes.push({
            type: 'modification',
            original: originalText.substring(0, 100) + (originalText.length > 100 ? '...' : ''),
            modified: optimizedText.substring(0, 100) + (optimizedText.length > 100 ? '...' : ''),
            reason: `根据${options.style}风格和${options.focus}要求进行优化`
        })
    }

    // 生成建议
    suggestions.push(
        '检查语法和拼写错误',
        '确保逻辑清晰连贯',
        '考虑添加更多细节或例子'
    )

    return {
        optimizedText,
        changes,
        suggestions
    }
}

function generateMockOptimization(text: string, options: OptimizeRequest['options']) {
    const mockOptimizedText = generateMockOptimizedText(text, options)

    return {
        optimizedText: mockOptimizedText,
        changes: [
            {
                type: 'modification',
                original: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                modified: mockOptimizedText.substring(0, 50) + (mockOptimizedText.length > 50 ? '...' : ''),
                reason: `根据${options.style}风格进行优化`
            }
        ],
        suggestions: [
            '考虑添加更多具体例子',
            '检查段落之间的逻辑连接',
            '确保语言表达更加生动'
        ]
    }
}

function generateMockOptimizedText(text: string, options: OptimizeRequest['options']): string {
    // 简单的模拟优化
    let optimized = text

    // 根据风格调整
    switch (options.style) {
        case 'formal':
            optimized = optimized.replace(/很/g, '非常')
            optimized = optimized.replace(/好的/g, '良好的')
            break
        case 'casual':
            optimized = optimized.replace(/非常/g, '很')
            optimized = optimized.replace(/良好的/g, '好的')
            break
        case 'academic':
            optimized = optimized.replace(/我们/g, '本研究')
            optimized = optimized.replace(/我觉得/g, '研究表明')
            break
        case 'creative':
            optimized = optimized.replace(/很/g, '极其')
            optimized = optimized.replace(/好的/g, '出色的')
            break
    }

    // 根据长度调整
    if (options.length === 'shorter') {
        optimized = optimized.replace(/，[^，。]*，/g, '，')
    } else if (options.length === 'longer') {
        optimized = optimized.replace(/。/g, '。此外，')
    }

    return optimized
}
