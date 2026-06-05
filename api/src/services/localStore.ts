import type { AuditEvent, ContextPack, MemoryFact, MemorySource, PrivacyScope, SearchResult, WikiPage } from "../types.js";
import type { MemoryStore } from "./memoryStore.js";

export class LocalMemoryStore implements MemoryStore {
  private sources: MemorySource[] = [];
  private facts: MemoryFact[] = [];
  private wikiPages = new Map<string, WikiPage>();
  private contextPacks: ContextPack[] = [];
  private auditLog: AuditEvent[] = [];

  async init() {}

  async reset() {
    this.sources = [];
    this.facts = [];
    this.wikiPages.clear();
    this.contextPacks = [];
    this.auditLog = [];
  }

  async addSource(source: MemorySource) {
    this.sources.push(source);
  }

  async addFacts(facts: MemoryFact[]) {
    this.facts.push(...facts);
  }

  async upsertWikiPages(pages: WikiPage[]) {
    for (const page of pages) {
      const existing = this.wikiPages.get(page.slug);
      if (existing) {
        this.wikiPages.set(page.slug, {
          ...page,
          sourceIds: [...new Set([...existing.sourceIds, ...page.sourceIds])],
          body: mergePageBodies(existing.body, page.body)
        });
      } else {
        this.wikiPages.set(page.slug, page);
      }
    }
  }

  async search(query: string, scope?: PrivacyScope, limit = 10): Promise<SearchResult[]> {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const factResults = this.facts
      .filter((fact) => !scope || fact.scope === scope)
      .map((fact) => ({
        id: fact.id,
        type: "fact" as const,
        title: fact.category,
        snippet: fact.value,
        scope: fact.scope,
        sourceId: fact.sourceId,
        score: scoreText(fact.value, tokens),
        createdAt: fact.createdAt
      }));

    const pageResults = [...this.wikiPages.values()].map((page) => ({
      id: page.id,
      type: "wiki_page" as const,
      title: page.title,
      snippet: page.body.slice(0, 240),
      score: scoreText(`${page.title} ${page.body}`, tokens),
      updatedAt: page.updatedAt
    }));

    const sourceResults = this.sources
      .filter((source) => !scope || source.scope === scope)
      .map((source) => ({
        id: source.id,
        type: "source" as const,
        title: source.title,
        snippet: source.text.slice(0, 240),
        scope: source.scope,
        score: scoreText(`${source.title} ${source.text}`, tokens),
        createdAt: source.createdAt
      }));

    return [...factResults, ...pageResults, ...sourceResults]
      .filter((result) => (query ? (result.score ?? 0) > 0 : true))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  async getFacts(scopes?: PrivacyScope[]) {
    return scopes?.length ? this.facts.filter((fact) => scopes.includes(fact.scope)) : [...this.facts];
  }

  async saveContextPack(pack: ContextPack) {
    this.contextPacks.push(pack);
  }

  async addAudit(event: AuditEvent) {
    this.auditLog.unshift(event);
  }

  async getAuditLog(limit = 50) {
    return this.auditLog.slice(0, limit);
  }
}

function scoreText(value: string, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const lower = value.toLowerCase();
  return tokens.reduce((score, token) => score + (lower.includes(token) ? 1 : 0), 0);
}

function mergePageBodies(existing: string, incoming: string): string {
  const lines = new Set([...existing.split("\n"), ...incoming.split("\n")].filter(Boolean));
  return [...lines].join("\n");
}

