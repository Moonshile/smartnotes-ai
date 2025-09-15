# smartnotes.ai (MVP)

A simple notes editor with an embedded AI chat sidebar. Defaults to a local-first experience; the chat API can call OpenAI if `OPENAI_API_KEY` is set.

## Features
- Tiptap-based rich-text editor
- Chat sidebar that uses the current document as context
- Streaming responses via SSE
- Safe fallback message if no API key is configured
- Insert AI insights into your note with one click

## Getting Started

1) Install deps

```bash
pnpm i # or npm install or yarn
```

2) Set environment (optional for live AI)

```bash
# .env.local
OPENAI_API_KEY=sk-...
```

3) Run dev server

```bash
pnpm dev # or npm run dev
```

Open http://localhost:3000

## Notes
- Retrieval/embeddings are not implemented yet; the chat currently sends the current document as context. We can add chunking and embeddings next.
- No auth or persistence beyond in-memory state yet. We can add IndexedDB (Dexie) for local persistence or a small SQLite backend later.

### Saving
- Click the Save button in the editor toolbar, or press Cmd/Ctrl+S.
- Content is saved locally to your browser (`localStorage`).

### Export
- Click the Export button to download your current note as a standalone `.html` file.
- The filename uses your first heading (or first sentence) when available.

### Insert AI insights
- After the assistant replies, click “Insert” under the message to insert it at your current cursor in the editor.
- Inserts with a small “💡 AI Insight” label and blockquote formatting; list-looking content becomes proper bullets.

<!-- Upload functionality is temporarily disabled while we refine converters. -->

## Next Steps
- Slash commands in-editor:
  - `/summarize` — summarize selection, or whole doc if none
  - `/rewrite <tone>` — rewrite selection in a given tone (e.g. `formal`, `friendly`)
  - `/extract` — extract tasks as a bullet list
  Type the command on a new line and press Enter.
- Document list + basic persistence
- Embeddings + retrieval for better grounding across all notes
- Citations to reference specific doc sections
- Optional: Ollama provider support for local LLMs
## Realtime Collaboration (Experimental)
- Shared editing powered by Yjs + y-websocket
- Presence cursors and usernames (basic)
- Comment mode: AI Suggest creates suggestions instead of overwriting text
- Accept/Reject suggestion in the comments panel

### Run the websocket server
```bash
node server/y-websocket.js  # starts on ws://localhost:1234
```

Open multiple browser windows to the same page (same “room”) to test.

Notes:
- The current room defaults to `default-room`. To change rooms, set `localStorage.room = "your-room"` and refresh.
- Set `OPENAI_API_KEY` for live AI suggestions (`/api/ai/suggest`).
