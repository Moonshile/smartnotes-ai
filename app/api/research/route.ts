export const runtime = 'edge'

type ResearchRequest = {
    text: string
    sources?: ('web' | 'wikipedia' | 'academic')[]
    maxResults?: number
}

type ResearchResult = {
    id: string
    title: string
    summary: string
    source: string
    url: string
    relevance: number
    credibility: 'high' | 'medium' | 'low'
}

type ResearchResponse = {
    success: boolean
    data?: {
        results: ResearchResult[]
        query: string
        suggestions: string[]
    }
    error?: string
}

export async function POST(req: Request): Promise<Response> {
    try {
        const { text, sources = ['wikipedia'], maxResults = 5 }: ResearchRequest = await req.json()

        // 验证输入
        if (!text || typeof text !== 'string') {
            return Response.json({
                success: false,
                error: '文本内容是必需的'
            }, { status: 400 })
        }

        if (text.length > 1000) {
            return Response.json({
                success: false,
                error: '文本长度不能超过1000字符'
            }, { status: 400 })
        }

        // 生成搜索查询
        const query = generateSearchQuery(text)

        // 并行搜索多个源
        const searchPromises = sources.map(source =>
            searchSource(source, query, maxResults)
        )

        const results = await Promise.allSettled(searchPromises)

        const successfulResults = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value)
            .flat()
            .slice(0, maxResults)

        // 按相关性排序
        successfulResults.sort((a, b) => b.relevance - a.relevance)

        // 如果没有搜索结果，生成一些基本的模拟结果
        let finalResults = successfulResults
        if (finalResults.length === 0) {
            console.log('No search results found, generating mock results for:', query)
            finalResults = generateMockWebResults(query, maxResults)
        }

        const suggestions = generateSuggestions(text, finalResults)

        console.log('Returning search results:', finalResults.length)

        return Response.json({
            success: true,
            data: {
                results: finalResults,
                query,
                suggestions
            }
        })

    } catch (error) {
        console.error('Research error:', error)
        return Response.json({
            success: false,
            error: '检索资料时发生错误，请稍后再试'
        }, { status: 500 })
    }
}

function generateSearchQuery(text: string): string {
    // 提取关键词
    const keywords = text
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1)
        .slice(0, 5)

    return keywords.join(' ')
}

async function searchSource(source: string, query: string, maxResults: number): Promise<ResearchResult[]> {
    switch (source) {
        case 'wikipedia':
            return await searchWikipedia(query, maxResults)
        case 'web':
            return await searchWeb(query, maxResults)
        case 'academic':
            return await searchAcademic(query, maxResults)
        default:
            return []
    }
}

async function searchWikipedia(query: string, maxResults: number): Promise<ResearchResult[]> {
    try {
        const response = await fetch(
            `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
            {
                headers: {
                    'User-Agent': 'SmartNotes-AI/1.0'
                }
            }
        )

        if (!response.ok) {
            return []
        }

        const data = await response.json()

        if (data.type === 'disambiguation') {
            // 处理消歧义页面
            return []
        }

        return [{
            id: `wiki-${Date.now()}`,
            title: data.title || query,
            summary: data.extract || '暂无摘要',
            source: 'Wikipedia',
            url: data.content_urls?.desktop?.page || `https://zh.wikipedia.org/wiki/${encodeURIComponent(query)}`,
            relevance: 0.9,
            credibility: 'high'
        }]
    } catch (error) {
        console.warn('Wikipedia search error:', error)
        return []
    }
}

async function searchWeb(query: string, maxResults: number): Promise<ResearchResult[]> {
    // 由于CORS限制，这里返回模拟数据
    // 在实际部署中，需要使用代理或服务器端搜索API
    return generateMockWebResults(query, maxResults)
}

async function searchAcademic(query: string, maxResults: number): Promise<ResearchResult[]> {
    // 模拟学术搜索
    return generateMockAcademicResults(query, maxResults)
}

function generateMockWebResults(query: string, maxResults: number): ResearchResult[] {
    const mockResults: ResearchResult[] = [
        {
            id: `web-1-${Date.now()}`,
            title: `关于"${query}"的详细分析`,
            summary: `本文深入分析了${query}的相关概念、发展历程和实际应用，为读者提供了全面的知识框架。`,
            source: '学术网站',
            url: `https://example.com/article/${encodeURIComponent(query)}`,
            relevance: 0.85,
            credibility: 'high'
        },
        {
            id: `web-2-${Date.now()}`,
            title: `${query}的最新研究进展`,
            summary: `最新的研究显示，${query}在多个领域都有重要应用，特别是在技术发展和创新方面。`,
            source: '科技媒体',
            url: `https://tech.example.com/${encodeURIComponent(query)}`,
            relevance: 0.75,
            credibility: 'medium'
        },
        {
            id: `web-3-${Date.now()}`,
            title: `专家解读：${query}的影响与意义`,
            summary: `多位专家就${query}的现状和未来发展趋势进行了深入讨论，提出了许多有价值的观点。`,
            source: '新闻网站',
            url: `https://news.example.com/${encodeURIComponent(query)}`,
            relevance: 0.70,
            credibility: 'medium'
        }
    ]

    return mockResults.slice(0, maxResults)
}

function generateMockAcademicResults(query: string, maxResults: number): ResearchResult[] {
    const mockResults: ResearchResult[] = [
        {
            id: `academic-1-${Date.now()}`,
            title: `A Comprehensive Study of ${query}`,
            summary: `This paper presents a comprehensive analysis of ${query}, examining its theoretical foundations and practical implications.`,
            source: 'Journal of Research',
            url: `https://academic.example.com/paper/${encodeURIComponent(query)}`,
            relevance: 0.95,
            credibility: 'high'
        },
        {
            id: `academic-2-${Date.now()}`,
            title: `Recent Advances in ${query} Research`,
            summary: `This study reviews recent advances in ${query} research and identifies key areas for future investigation.`,
            source: 'Science Journal',
            url: `https://science.example.com/${encodeURIComponent(query)}`,
            relevance: 0.88,
            credibility: 'high'
        }
    ]

    return mockResults.slice(0, maxResults)
}

function generateSuggestions(text: string, results: ResearchResult[]): string[] {
    const suggestions: string[] = []

    if (results.length === 0) {
        suggestions.push('尝试使用更具体的关键词进行搜索')
        suggestions.push('检查拼写是否正确')
        suggestions.push('尝试使用同义词或相关术语')
    } else {
        suggestions.push('可以结合多个来源的信息来丰富内容')
        suggestions.push('注意信息的时效性和可信度')
        suggestions.push('考虑添加引用和参考文献')
    }

    if (text.length < 50) {
        suggestions.push('提供更多上下文信息可能获得更好的搜索结果')
    }

    return suggestions
}
