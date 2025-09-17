export const runtime = 'edge'

type OutlineRequest = {
    title: string
    type?: 'article' | 'report' | 'essay' | 'blog'
    length?: 'short' | 'medium' | 'long'
    contentHint?: string
}

type OutlineItem = {
    level: number
    title: string
    description: string
    children?: OutlineItem[]
}

type OutlineResponse = {
    success: boolean
    data?: {
        outline: OutlineItem[]
        introduction: string
        suggestions: string[]
    }
    error?: string
}

export async function POST(req: Request): Promise<Response> {
    try {
        const { title, type = 'article', length = 'medium', contentHint }: OutlineRequest = await req.json()

        // 验证输入
        if (!title || typeof title !== 'string') {
            return Response.json({
                success: false,
                error: '标题是必需的'
            }, { status: 400 })
        }

        if (title.length > 200) {
            return Response.json({
                success: false,
                error: '标题长度不能超过200字符'
            }, { status: 400 })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            // 返回模拟数据
            const mockData = generateMockOutline(title, type, length, contentHint)
            return Response.json({
                success: true,
                data: mockData
            })
        }

        // 构建提示词
        const prompt = buildOutlinePrompt(title, type, length, contentHint)

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
                        content: '你是一个专业的写作助手，擅长生成结构化的文章大纲和开头段落。请确保生成的大纲具有清晰的层次结构，包含主标题和子标题。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.2,
                max_tokens: 2500
            })
        })

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || ''

        // 解析AI返回的内容
        const parsedData = parseOutlineResponse(content, title)

        return Response.json({
            success: true,
            data: parsedData
        })

    } catch (error) {
        console.error('Outline generation error:', error)
        return Response.json({
            success: false,
            error: '生成大纲时发生错误，请稍后再试'
        }, { status: 500 })
    }
}

function buildOutlinePrompt(title: string, type: string, length: string, contentHint?: string): string {
    const lengthMap = {
        short: '简短（3-4个主要章节，每个章节包含2-3个子章节）',
        medium: '中等（5-6个主要章节，每个章节包含3-4个子章节）',
        long: '详细（7-8个主要章节，每个章节包含4-5个子章节）'
    }

    const typeMap = {
        article: '文章',
        report: '报告',
        essay: '论文',
        blog: '博客'
    }

    let prompt = `请为标题"${title}"生成一篇${typeMap[type as keyof typeof typeMap]}的大纲和开头段落。

要求：
1. 文章类型：${typeMap[type as keyof typeof typeMap]}
2. 文章长度：${lengthMap[length as keyof typeof lengthMap]}
3. 大纲结构：必须包含多级标题（主标题和子标题），层次清晰
4. 开头段落：200-300字，引人入胜，与主题紧密相关`

    if (contentHint) {
        prompt += `\n5. 内容要求：${contentHint}`
    }

    prompt += `

请以以下JSON格式返回：
{
  "outline": [
    {
      "level": 1,
      "title": "主标题",
      "description": "章节描述",
      "children": [
        {
          "level": 2,
          "title": "子标题",
          "description": "子章节描述"
        },
        {
          "level": 2,
          "title": "另一个子标题",
          "description": "另一个子章节描述"
        }
      ]
    }
  ],
  "introduction": "开头段落内容",
  "suggestions": ["写作建议1", "写作建议2", "写作建议3"]
}

注意：
- 确保每个主标题都有2-4个子标题
- 子标题要具体、有针对性
- 描述要简洁明了，不超过50字
- 开头段落要直接切入主题，不要包含"本文将"等套话`

    return prompt
}

function parseOutlineResponse(content: string, title: string) {
    try {
        // 尝试解析JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            return {
                outline: parsed.outline || [],
                introduction: parsed.introduction || '',
                suggestions: parsed.suggestions || []
            }
        }
    } catch (error) {
        console.warn('Failed to parse JSON response:', error)
    }

    // 如果JSON解析失败，使用文本解析
    return parseTextResponse(content, title)
}

function parseTextResponse(content: string, title: string) {
    const lines = content.split('\n').filter(line => line.trim())

    const outline: OutlineItem[] = []
    let introduction = ''
    const suggestions: string[] = []

    let currentSection = ''
    let inOutline = false
    let inIntroduction = false
    let inSuggestions = false

    for (const line of lines) {
        const trimmed = line.trim()

        if (trimmed.includes('大纲') || trimmed.includes('结构')) {
            inOutline = true
            inIntroduction = false
            inSuggestions = false
            continue
        }

        if (trimmed.includes('开头') || trimmed.includes('引言') || trimmed.includes('介绍')) {
            inOutline = false
            inIntroduction = true
            inSuggestions = false
            continue
        }

        if (trimmed.includes('建议') || trimmed.includes('提示')) {
            inOutline = false
            inIntroduction = false
            inSuggestions = true
            continue
        }

        if (inOutline && (trimmed.startsWith('#') || trimmed.match(/^\d+\./))) {
            const level = trimmed.startsWith('##') ? 2 : trimmed.startsWith('#') ? 1 : 2
            const title = trimmed.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '')

            if (level === 1) {
                outline.push({
                    level: 1,
                    title,
                    description: '',
                    children: []
                })
                currentSection = title
            } else if (level === 2 && currentSection) {
                const parent = outline[outline.length - 1]
                if (parent) {
                    parent.children = parent.children || []
                    parent.children.push({
                        level: 2,
                        title,
                        description: ''
                    })
                }
            }
        }

        if (inIntroduction && trimmed && !trimmed.startsWith('#')) {
            introduction += trimmed + ' '
        }

        if (inSuggestions && (trimmed.startsWith('-') || trimmed.startsWith('•'))) {
            suggestions.push(trimmed.replace(/^[-•]\s*/, ''))
        }
    }

    return {
        outline: outline.length > 0 ? outline : generateDefaultOutline(title),
        introduction: introduction.trim() || generateDefaultIntroduction(title),
        suggestions: suggestions.length > 0 ? suggestions : generateDefaultSuggestions()
    }
}

function generateMockOutline(title: string, type: string, length: string, contentHint?: string) {
    const baseOutline = [
        {
            level: 1,
            title: '引言',
            description: '介绍主题背景和重要性',
            children: [
                {
                    level: 2,
                    title: '问题提出',
                    description: '阐述要解决的核心问题'
                },
                {
                    level: 2,
                    title: '研究意义',
                    description: '说明研究的重要性和价值'
                },
                {
                    level: 2,
                    title: '研究方法',
                    description: '概述采用的研究方法'
                }
            ]
        },
        {
            level: 1,
            title: '主体内容',
            description: '详细阐述主要观点',
            children: [
                {
                    level: 2,
                    title: '核心观点一',
                    description: '第一个主要观点的详细分析'
                },
                {
                    level: 2,
                    title: '核心观点二',
                    description: '第二个主要观点的详细分析'
                },
                {
                    level: 2,
                    title: '核心观点三',
                    description: '第三个主要观点的详细分析'
                }
            ]
        },
        {
            level: 1,
            title: '结论',
            description: '总结全文并提出展望',
            children: [
                {
                    level: 2,
                    title: '主要发现',
                    description: '总结主要研究成果'
                },
                {
                    level: 2,
                    title: '未来展望',
                    description: '展望未来发展方向'
                }
            ]
        }
    ]

    // 根据长度调整章节数量
    if (length === 'short') {
        baseOutline.splice(1, 1) // 移除一个主体章节
    } else if (length === 'long') {
        baseOutline.splice(1, 0, {
            level: 1,
            title: '理论基础',
            description: '阐述相关理论基础',
            children: [
                {
                    level: 2,
                    title: '相关理论',
                    description: '介绍相关理论框架'
                },
                {
                    level: 2,
                    title: '理论应用',
                    description: '说明理论在实际中的应用'
                }
            ]
        })
    }

    return {
        outline: baseOutline,
        introduction: generateIntroduction(title, contentHint),
        suggestions: [
            '确保每个章节都有明确的主题',
            '使用具体的事例来支撑观点',
            '保持逻辑清晰，层次分明',
            '注意段落之间的过渡和连接'
        ]
    }
}

function generateIntroduction(title: string, contentHint?: string): string {
    let intro = `关于"${title}"这个话题，在当今社会具有重要的现实意义。`
    
    if (contentHint) {
        intro += `特别是${contentHint}，这为我们的研究提供了新的视角。`
    }
    
    intro += `随着时代的发展，我们需要深入思考这一问题的本质和影响。本文将从多个角度分析这一主题，希望能够为读者提供有价值的见解和思考。`
    
    return intro
}

function generateDefaultOutline(title: string): OutlineItem[] {
    return [
        {
            level: 1,
            title: '引言',
            description: '介绍主题背景',
            children: [
                {
                    level: 2,
                    title: '背景介绍',
                    description: '阐述问题背景'
                },
                {
                    level: 2,
                    title: '研究目的',
                    description: '说明研究目的'
                }
            ]
        },
        {
            level: 1,
            title: '主体内容',
            description: '详细阐述主要观点',
            children: [
                {
                    level: 2,
                    title: '主要观点',
                    description: '阐述核心观点'
                },
                {
                    level: 2,
                    title: '支撑论据',
                    description: '提供支撑论据'
                }
            ]
        },
        {
            level: 1,
            title: '结论',
            description: '总结全文',
            children: [
                {
                    level: 2,
                    title: '总结',
                    description: '总结主要观点'
                },
                {
                    level: 2,
                    title: '展望',
                    description: '展望未来发展'
                }
            ]
        }
    ]
}

function generateDefaultIntroduction(title: string): string {
    return `关于"${title}"这个话题，值得我们深入探讨。本文将从多个角度分析这一主题，希望能够为读者提供有价值的见解。`
}

function generateDefaultSuggestions(): string[] {
    return [
        '确保文章结构清晰',
        '使用具体事例支撑观点',
        '保持逻辑连贯性',
        '注意语言表达的准确性'
    ]
}