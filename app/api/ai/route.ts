export const runtime = 'edge'

type Body = {
  action: 'summarize' | 'rewrite' | 'extract'
  text: string
  tone?: string
}

export async function POST(req: Request) {
  const { action, text, tone }: Body = await req.json()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const fallback = mock(action, text, tone)
    return Response.json({ result: fallback })
  }

  const sys =
    'You are a helpful writing assistant embedded in a note-taking app. Keep outputs concise and directly usable within notes.'

  let userPrompt = ''
  if (action === 'summarize') {
    userPrompt = `Summarize the following content for a note. Use short paragraphs or bullets when helpful.\n\n${text}`
  } else if (action === 'rewrite') {
    const style = tone || 'clear and concise'
    userPrompt = `Rewrite the following content in a ${style} style while preserving meaning. Do not add extra information.\n\n${text}`
  } else if (action === 'extract') {
    userPrompt = `Extract actionable tasks as a bullet list from the following content. Each bullet should start with a verb.\n\n${text}`
  }

  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    return new Response('LLM error', { status: 500 })
  }

  const json = await res.json()
  const result: string = json.choices?.[0]?.message?.content || ''
  return Response.json({ result })
}

function mock(action: Body['action'], text: string, tone?: string) {
  if (action === 'summarize') {
    const first = text.split(/\n+/).slice(0, 2).join(' ')
    return `Summary (mock): ${first.slice(0, 160)}…`
  }
  if (action === 'rewrite') {
    const t = tone || 'clear and concise'
    return `Rewrite (${t}, mock): ${text.slice(0, 160)}…`
  }
  if (action === 'extract') {
    const lines = text.split(/\n+/).filter(Boolean).slice(0, 3)
    const bullets = lines.map((l, i) => `- Follow up on: ${l.slice(0, 60)}…`).join('\n')
    return bullets || '- No obvious tasks found.'
  }
  return 'Unsupported action.'
}

