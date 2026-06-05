# 3-Minute Demo Script

## 0:00 - Problem

Every AI agent starts from zero. Your travel preferences, writing style, project constraints, and private notes are trapped inside separate chatbots.

## 0:20 - Capture

Open Memory Dock from the macOS menu bar. Drop:

- `samples/personal-preferences.md`
- `samples/travel-notes.md`
- `samples/private-health-note.txt`

Say: "These are immutable raw sources. Gemini turns them into durable memories and an LLM Wiki."

## 0:55 - Elastic Memory Search

Search:

- `morning flights`
- `writing style`

Show results from facts, sources, and wiki pages. Say: "Elastic is the retrieval layer: exact search, semantic-style recall, filters, scopes, and auditability."

## 1:25 - Privacy

Show the private health note marked `sensitive`. Say: "Sensitive and never-export memories can be searched locally but are excluded from portable context packs by default."

## 1:45 - Context Pack

Generate a Gemini context pack with:

```text
Create a travel-planning context pack for another agent, excluding sensitive and work memories.
```

Show that the pack includes travel preferences and excludes the sensitive health note.

## 2:15 - Agent Builder Proof

Open the Gemini/Agent Builder **Memory Passport Agent**. Ask:

```text
Create a travel-planning context pack for another agent, but exclude sensitive and work memories.
```

Show the agent retrieving through Elastic MCP and producing a scoped pack with memory IDs.

## 2:45 - Close

Say:

```text
Memory Dock is a user-owned memory passport for the agent era: files in, living LLM Wiki maintained by Gemini, portable scoped context out through Elastic.
```

