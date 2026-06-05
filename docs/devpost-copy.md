# Devpost Copy

## Project Name

Memory Dock: A Dropbox for Agent Memory

## Elevator Pitch

Memory Dock turns your files and notes into a portable, permissioned memory passport for AI agents, using Gemini to maintain a living LLM Wiki and Elastic MCP to retrieve the right context anywhere.

## Inspiration

AI agents are multiplying, but memory is fragmented. ChatGPT, Claude, Gemini, Codex, and future agents each start from zero unless the user repeats the same context again and again. Memory Dock gives users a central memory layer they own.

## What It Does

Memory Dock is a native macOS menu bar app. Users drop files or paste notes into it. Gemini extracts durable memories and maintains a structured LLM Wiki. Elastic indexes raw sources, extracted facts, wiki pages, context packs, and audit events. The user can search memory and export scoped context packs for other agents.

## How We Used Elastic

Elastic is the retrieval and governance substrate. Memory Dock stores sources, facts, wiki pages, context packs, and audit logs in Elastic indices. The Gemini proof agent retrieves memory through Elastic MCP, filters by scope, cites memory IDs, and excludes sensitive memories from exports.

## How We Used Google Cloud / Gemini

Gemini extracts durable memories from raw files and updates the LLM Wiki. Google Cloud Run hosts the API. Gemini/Agent Builder runs the Memory Passport Agent that retrieves scoped memory through Elastic MCP.

## Built With

- SwiftUI / MenuBarExtra
- Node.js / TypeScript / Express
- Google Gemini
- Google Cloud Run
- Elastic Cloud
- Elastic MCP

