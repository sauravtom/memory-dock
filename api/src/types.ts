export type PrivacyScope = "personal" | "work" | "sensitive" | "temporary" | "never_export";

export type ContextFormat = "gemini" | "claude" | "chatgpt" | "codex" | "json";

export interface MemorySource {
  id: string;
  title: string;
  kind: "file" | "text";
  mimeType: string;
  originalName?: string;
  text: string;
  scope: PrivacyScope;
  tags: string[];
  createdAt: string;
}

export interface MemoryFact {
  id: string;
  sourceId: string;
  value: string;
  category: "preference" | "profile" | "project" | "person" | "travel" | "decision" | "constraint" | "other";
  scope: PrivacyScope;
  confidence: number;
  tags: string[];
  createdAt: string;
}

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  body: string;
  sourceIds: string[];
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  action: "ingest" | "search" | "context_pack" | "wiki_update" | "demo_reset";
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ContextPack {
  id: string;
  format: ContextFormat;
  purpose: string;
  includedScopes: PrivacyScope[];
  excludedScopes: PrivacyScope[];
  content: string;
  memoryIds: string[];
  createdAt: string;
}

export interface SearchResult {
  id: string;
  type: "fact" | "wiki_page" | "source";
  title: string;
  snippet: string;
  scope?: PrivacyScope;
  sourceId?: string;
  score?: number;
  createdAt?: string;
  updatedAt?: string;
}

