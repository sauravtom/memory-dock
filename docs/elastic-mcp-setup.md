# Elastic MCP Setup

Memory Dock uses Elastic as the load-bearing retrieval layer. The API writes source documents, extracted facts, LLM Wiki pages, context packs, and audit events into Elastic indices. The Gemini/Agent Builder proof agent retrieves those memories through Elastic MCP.

## Indices

The API creates these indices:

- `memory_sources`
- `memory_facts`
- `memory_wiki_pages`
- `memory_context_packs`
- `memory_audit_log`

Run:

```bash
cd api
STORE_MODE=elastic npm run setup:elastic
```

## MCP Endpoint

Elastic Agent Builder MCP endpoint format:

```text
{KIBANA_URL}/api/agent_builder/mcp
```

If using a custom Kibana Space:

```text
{KIBANA_URL}/s/{SPACE_NAME}/api/agent_builder/mcp
```

Use an API key scoped to the `memory_*` indices and Agent Builder read privileges.

## Demo Tool Queries

The Memory Passport Agent should use Elastic MCP to search:

```text
index: memory_facts
query: travel planning preferences, exclude sensitive and work
```

```text
index: memory_audit_log
query: latest context pack and memory retrieval events
```

## Safety Rule

The agent must never export facts where:

```text
scope in ["sensitive", "never_export"]
```

