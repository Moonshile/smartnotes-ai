export const runtime = 'edge'

type InMsg = { role: 'user' | 'assistant' | 'system'; content: string }

// 检测是否需要搜索
function shouldSearch(message: string): boolean {
  const searchKeywords = [
    '搜索', '查找', '资料', '信息', '研究', '了解', '查询', '最新', '消息', '新闻',
    'search', 'find', 'research', 'information', '资料检索', 'latest', 'news'
  ]
  
  // 检查是否包含搜索关键词
  const hasSearchKeyword = searchKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  )
  
  // 检查是否询问具体的人或事件（可能是需要搜索的）
  const hasSpecificQuery = /(王自如|董明珠|格力|小米|华为|苹果|特斯拉|马斯克|OpenAI|ChatGPT)/i.test(message)
  
  console.log('Message:', message)
  console.log('Has search keyword:', hasSearchKeyword)
  console.log('Has specific query:', hasSpecificQuery)
  
  return hasSearchKeyword || hasSpecificQuery
}

// 从消息中提取搜索关键词
function extractSearchQuery(message: string): string {
  // 移除搜索相关的词汇，提取实际搜索内容
  const searchPrefixes = [
    '搜索', '查找', '资料', '信息', '研究', '了解', '查询', '最新', '消息', '新闻',
    'search', 'find', 'research', 'information', '资料检索', 'latest', 'news'
  ]
  
  let query = message
  for (const prefix of searchPrefixes) {
    query = query.replace(new RegExp(prefix, 'gi'), '').trim()
  }
  
  // 移除常见的连接词和标点
  const connectors = ['关于', '的', '相关', '有关', '什么', '如何', '为什么', 'about', 'related to', 'regarding', 'what', 'how', 'why']
  for (const connector of connectors) {
    query = query.replace(new RegExp(connector, 'gi'), '').trim()
  }
  
  // 移除标点符号
  query = query.replace(/[，。！？、；：""''（）【】《》]/g, ' ').trim()
  
  // 如果提取后为空，返回原消息
  const finalQuery = query || message
  
  console.log('Extracted search query:', finalQuery)
  return finalQuery
}

// 调用搜索API
async function performSearch(query: string) {
  try {
    // 使用相对路径调用搜索API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    console.log('Searching for:', query)
    console.log('API URL:', `${baseUrl}/api/research`)
    
    const response = await fetch(`${baseUrl}/api/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: query,
        sources: ['wikipedia', 'web', 'academic'],
        maxResults: 3
      })
    })
    
    console.log('Search response status:', response.status)
    
    if (!response.ok) {
      console.error('Search API error:', response.status, response.statusText)
      return null
    }
    
    const data = await response.json()
    console.log('Search results:', data)
    return data.success ? data.data : null
  } catch (error) {
    console.error('Search error:', error)
    return null
  }
}

export async function POST(req: Request) {
    const { messages, context } = (await req.json()) as { messages: InMsg[]; context?: string }

    // 检查最后一条用户消息是否需要搜索
    const lastMessage = messages[messages.length - 1]
    let searchResults = null

    if (lastMessage && lastMessage.role === 'user' && shouldSearch(lastMessage.content)) {
        const searchQuery = extractSearchQuery(lastMessage.content)
        searchResults = await performSearch(searchQuery)
    }

  const system = {
    role: 'system',
    content: `You are an assistant embedded in a note-taking app. Be concise, helpful, and reference the user's current document context when relevant. If the question is unrelated to the document, still answer normally. When summarizing or transforming text, operate only on the provided context unless asked otherwise.

${searchResults ? `IMPORTANT: The user has requested information about "${extractSearchQuery(lastMessage.content)}". I have searched for this information and found the following results:

${searchResults.results.map((result: any, index: number) => 
  `${index + 1}. **${result.title}** (${result.source})
   ${result.summary}
   URL: ${result.url}
   Relevance: ${result.relevance}
   Credibility: ${result.credibility}
`).join('\n')}

Please provide a comprehensive answer based on these search results. Include relevant citations and mention the sources. Do NOT say you cannot search the internet or provide real-time information.` : ''}`,
  }

    const ctxMsg = context
        ? [{ role: 'system', content: `Document context (may be partial):\n\n${context}` }]
        : []

    const payload = {
        model: 'gpt-4o-mini',
        messages: [system, ...ctxMsg, ...messages],
        stream: true,
        temperature: 0.2,
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        // Return a friendly streamed mock if no key is set
        const encoder = new TextEncoder()
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                const chunks = [
                    { delta: 'No API key configured. ' },
                    { delta: 'Set OPENAI_API_KEY to enable live responses.' },
                ]
                for (const c of chunks) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`))
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
            },
        })
        return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...payload, model: 'gpt-4o-mini' }),
    })

    if (!res.ok || !res.body) {
        return new Response('Error from OpenAI', { status: 500 })
    }

    // Transform OpenAI stream into simple {delta} events for the client
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const reader = res.body!.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
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
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                            controller.close()
                            return
                        }
                        try {
                            const json = JSON.parse(data)
                            const delta = json.choices?.[0]?.delta?.content || ''
                            if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
                        } catch {
                            // ignore non-JSON lines
                        }
                    }
                }
                if (buffer.length) {
                    // flush remaining
                    try {
                        const json = JSON.parse(buffer)
                        const delta = json.choices?.[0]?.delta?.content || ''
                        if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
                    } catch { }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
            } catch (e) {
                controller.error(e)
            }
        },
    })

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}

