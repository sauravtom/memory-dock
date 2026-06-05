import type { AuditEvent, ContextPack, MemoryFact, MemorySource, PrivacyScope, SearchResult, WikiPage } from "../types.js";

export interface MemoryStore {
  init(): Promise<void>;
  reset(): Promise<void>;
  addSource(source: MemorySource): Promise<void>;
  addFacts(facts: MemoryFact[]): Promise<void>;
  upsertWikiPages(pages: WikiPage[]): Promise<void>;
  search(query: string, scope?: PrivacyScope, limit?: number): Promise<SearchResult[]>;
  getFacts(scopes?: PrivacyScope[]): Promise<MemoryFact[]>;
  saveContextPack(pack: ContextPack): Promise<void>;
  addAudit(event: AuditEvent): Promise<void>;
  getAuditLog(limit?: number): Promise<AuditEvent[]>;
}

