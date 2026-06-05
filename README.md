# Memory Dock

**Memory Dock is a Dropbox for agent memory.** It is a macOS menu bar app and Cloud Run-ready API that turns files and notes into a portable, permissioned memory passport for AI agents.

Users drop files or paste notes into the menu bar app. Gemini extracts durable memories and maintains a living LLM Wiki. Elastic Cloud indexes sources, facts, wiki pages, context packs, and audit events so Gemini and other agents can retrieve the right memory through Elastic MCP without locking context inside one chatbot.

## Hackathon Positioning

- **Track:** Elastic
- **Title:** Memory Dock: A Dropbox for Agent Memory
- **One-liner:** Memory Dock turns your files and notes into a portable, permissioned memory passport for AI agents, using Gemini to maintain a living LLM Wiki and Elastic MCP to retrieve the right context anywhere.

## Repo Layout

```text
api/          Cloud Run-ready Node/TypeScript API
macos/        Native SwiftUI menu bar app
samples/      Deterministic demo source files
docs/         Demo script, deployment, and Agent Builder setup
web/          Static project page for hosted demo
```

## Quick Start

```bash
cd api
cp ../.env.example .env
npm install
npm run dev
```

In another terminal:

```bash
cd macos
swift run MemoryDock
```

The API defaults to `STORE_MODE=local`, which works without Elastic or Gemini keys for deterministic demos. Set `STORE_MODE=elastic`, `ELASTICSEARCH_NODE`, and `ELASTICSEARCH_API_KEY` to use Elastic Cloud.

## API

- `POST /api/sources` - upload `.txt`, `.md`, `.json`, or simple `.pdf` source files.
- `POST /api/memories/text` - save pasted memory text.
- `GET /api/search?q=&scope=&limit=` - retrieve memories.
- `POST /api/context-packs` - export scoped context for Gemini, Claude, ChatGPT, Codex, or JSON.
- `GET /api/audit-log` - show memory access history.
- `POST /api/demo/reset` - reset and seed demo data.

## Demo

Read [docs/demo-script.md](docs/demo-script.md) for the 3-minute demo flow.

