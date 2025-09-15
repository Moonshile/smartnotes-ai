export const runtime = 'edge'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { text?: string; instruction?: string }
  const text = body.text || ''
  const instruction = body.instruction || 'Improve clarity while preserving meaning.'
  // Simple language hint: detect if content contains CJK characters
  const hasCJK = /[\u3400-\u9FFF\uF900-\uFAFF]/.test(text)
  const langHint = hasCJK ? 'Chinese' : 'English'

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const mock = [
      '- Clarify the main point in the first sentence.',
      '- Add a concrete example to support the claim.',
      '- Consider a tighter transition into the next paragraph.'
    ].join('\n')
    return Response.json({ suggestion: mock, rationale: 'Mocked response. Set OPENAI_API_KEY for live suggestions.' })
  }

  const sys = [
    "You are a thoughtful teammate leaving review COMMENTS on a colleague's draft.",
    "Your primary goal is to assess the ideas and intent, not just the writing.",
    "Infer the author's likely role (e.g., product manager, engineer, designer, researcher) from the content, and tailor comments to what that role and their teammates would find most useful.",
    "Focus on product/strategy/impact assumptions, risks, prioritization, scope, evidence (metrics/users), trade‑offs, and next steps.",
    "If the selected text includes explicit questions (e.g., feasibility or 'can we do X?'), you MUST include a bullet with a concise, role‑aware answer.",
    "For AI/engineering feasibility, include: (1) Feasibility verdict (Yes/No/Likely with constraints), (2) Approach sketch (major components/steps), (3) Key constraints (data, latency, cost, model limits, platforms), (4) Major risks/unknowns, (5) Minimal metric(s) to validate, (6) Rough effort (S/M/L).",
    "If information is insufficient, explicitly state assumptions and ask 1 clarifying question, THEN provide a best‑effort provisional answer.",
    "Avoid generic advice like 'do more research' or 'look into it' — be concrete and helpful.",
    "Writing quality should only be addressed if comprehension is blocked; then add a brief clarifying question.",
    "OUTPUT RULES:",
    "- Respond in the SAME LANGUAGE as the input text (if the text is Chinese, reply in Chinese; if English, reply in English).",
    "- Produce 3–6 concise bullet comments (each starting with '- ').",
    "- Each bullet must be actionable (what to add/remove/move/decide/measure) or a high‑leverage question.",
    "- Do NOT rewrite the passage; do NOT include full revised text.",
  ].join('\n')

  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: `Instruction: ${instruction}\nLanguage: ${langHint}. Reply in exactly this language.\n\nSelected draft between <content> tags. Reply with ONLY bullet comments (start each with '- '). If the draft contains questions, include a feasibility/answer bullet as specified.\n\n<content>\n${text}\n</content>` },
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.2 }),
  })
  if (!res.ok) return new Response('LLM error', { status: 500 })
  const json = await res.json()
  const suggestion = json.choices?.[0]?.message?.content || ''
  return Response.json({ suggestion, rationale: 'Edit suggested.' })
}
