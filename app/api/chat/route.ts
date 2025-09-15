export const runtime = 'edge'

type InMsg = { role: 'user' | 'assistant' | 'system'; content: string }

export async function POST(req: Request) {
  const { messages, context } = (await req.json()) as { messages: InMsg[]; context?: string }

  const system = {
    role: 'system',
    content:
      'You are an assistant embedded in a note-taking app. Be concise, helpful, and reference the user\'s current document context when relevant. If the question is unrelated to the document, still answer normally. When summarizing or transforming text, operate only on the provided context unless asked otherwise.',
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
          } catch {}
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

