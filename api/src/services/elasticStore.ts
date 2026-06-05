import { Client } from "@elastic/elasticsearch";
import { config, requireElasticConfig } from "../config.js";
import type { AuditEvent, ContextPack, MemoryFact, MemorySource, PrivacyScope, SearchResult, WikiPage } from "../types.js";
import type { MemoryStore } from "./memoryStore.js";

type IndexName = "sources" | "facts" | "wiki_pages" | "context_packs" | "audit_log";

export class ElasticMemoryStore implements MemoryStore {
  private client: Client;

  constructor() {
    requireElasticConfig();
    this.client = new Client({
      node: config.elasticsearchNode,
      auth: { apiKey: config.elasticsearchApiKey }
    });
  }

  async init() {
    await Promise.all([
      this.ensureIndex("sources"),
      this.ensureIndex("facts"),
      this.ensureIndex("wiki_pages"),
      this.ensureIndex("context_packs"),
      this.ensureIndex("audit_log")
    ]);
  }

  async reset() {
    await Promise.all([
      this.client.deleteByQuery({ index: this.index("sources"), conflicts: "proceed", query: { match_all: {} } }).catch(ignoreMissing),
      this.client.deleteByQuery({ index: this.index("facts"), conflicts: "proceed", query: { match_all: {} } }).catch(ignoreMissing),
      this.client.deleteByQuery({ index: this.index("wiki_pages"), conflicts: "proceed", query: { match_all: {} } }).catch(ignoreMissing),
      this.client.deleteByQuery({ index: this.index("context_packs"), conflicts: "proceed", query: { match_all: {} } }).catch(ignoreMissing),
      this.client.deleteByQuery({ index: this.index("audit_log"), conflicts: "proceed", query: { match_all: {} } }).catch(ignoreMissing)
    ]);
  }

  async addSource(source: MemorySource) {
    await this.client.index({ index: this.index("sources"), id: source.id, document: source, refresh: true });
  }

  async addFacts(facts: MemoryFact[]) {
    if (facts.length === 0) return;
    await this.client.bulk({
      refresh: true,
      operations: facts.flatMap((fact) => [
        { index: { _index: this.index("facts"), _id: fact.id } },
        fact
      ])
    });
  }

  async upsertWikiPages(pages: WikiPage[]) {
    for (const page of pages) {
      await this.client.index({ index: this.index("wiki_pages"), id: page.id, document: page, refresh: true });
    }
  }

  async search(query: string, scope?: PrivacyScope, limit = 10): Promise<SearchResult[]> {
    const filters = scope ? [{ term: { scope } }] : [];
    const factSearch = await this.client.search<MemoryFact>({
      index: this.index("facts"),
      size: limit,
      query: {
        bool: {
          must: query ? [{ multi_match: { query, fields: ["value^3", "category", "tags"] } }] : [{ match_all: {} }],
          filter: filters
        }
      }
    });

    const wikiSearch = await this.client.search<WikiPage>({
      index: this.index("wiki_pages"),
      size: limit,
      query: query ? { multi_match: { query, fields: ["title^2", "body"] } } : { match_all: {} }
    });

    const sourceSearch = await this.client.search<MemorySource>({
      index: this.index("sources"),
      size: limit,
      query: {
        bool: {
          must: query ? [{ multi_match: { query, fields: ["title^2", "text", "tags"] } }] : [{ match_all: {} }],
          filter: filters
        }
      }
    });

    return [
      ...factSearch.hits.hits.map((hit) => factHitToResult(hit._source!, hit._score ?? undefined)),
      ...wikiSearch.hits.hits.map((hit) => wikiHitToResult(hit._source!, hit._score ?? undefined)),
      ...sourceSearch.hits.hits.map((hit) => sourceHitToResult(hit._source!, hit._score ?? undefined))
    ]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  async getFacts(scopes?: PrivacyScope[]) {
    const response = await this.client.search<MemoryFact>({
      index: this.index("facts"),
      size: 500,
      query: scopes?.length ? { terms: { scope: scopes } } : { match_all: {} }
    });
    return response.hits.hits.map((hit) => hit._source!).filter(Boolean);
  }

  async saveContextPack(pack: ContextPack) {
    await this.client.index({ index: this.index("context_packs"), id: pack.id, document: pack, refresh: true });
  }

  async addAudit(event: AuditEvent) {
    await this.client.index({ index: this.index("audit_log"), id: event.id, document: event, refresh: true });
  }

  async getAuditLog(limit = 50) {
    const response = await this.client.search<AuditEvent>({
      index: this.index("audit_log"),
      size: limit,
      sort: [{ createdAt: { order: "desc" } }],
      query: { match_all: {} }
    });
    return response.hits.hits.map((hit) => hit._source!).filter(Boolean);
  }

  private async ensureIndex(name: IndexName) {
    const index = this.index(name);
    const exists = await this.client.indices.exists({ index });
    if (exists) return;

    await this.client.indices.create({
      index,
      mappings: {
        dynamic: true,
        properties: {
          id: { type: "keyword" },
          sourceId: { type: "keyword" },
          scope: { type: "keyword" },
          tags: { type: "keyword" },
          category: { type: "keyword" },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
          value: { type: "text" },
          text: { type: "text" },
          title: { type: "text" },
          body: { type: "text" },
          content: { type: "text" }
        }
      }
    });
  }

  private index(name: IndexName) {
    return `${config.elasticIndexPrefix}_${name}`;
  }
}

function factHitToResult(fact: MemoryFact, score?: number): SearchResult {
  return {
    id: fact.id,
    type: "fact",
    title: fact.category,
    snippet: fact.value,
    scope: fact.scope,
    sourceId: fact.sourceId,
    score,
    createdAt: fact.createdAt
  };
}

function wikiHitToResult(page: WikiPage, score?: number): SearchResult {
  return {
    id: page.id,
    type: "wiki_page",
    title: page.title,
    snippet: page.body.slice(0, 280),
    score,
    updatedAt: page.updatedAt
  };
}

function sourceHitToResult(source: MemorySource, score?: number): SearchResult {
  return {
    id: source.id,
    type: "source",
    title: source.title,
    snippet: source.text.slice(0, 280),
    scope: source.scope,
    score,
    createdAt: source.createdAt
  };
}

function ignoreMissing(error: unknown) {
  const statusCode = typeof error === "object" && error && "statusCode" in error ? (error as { statusCode?: number }).statusCode : undefined;
  if (statusCode === 404) return;
  throw error;
}
