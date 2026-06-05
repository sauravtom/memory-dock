import cors from "cors";
import express from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { z } from "zod";
import { config } from "./config.js";
import { audit } from "./audit.js";
import { sampleSources } from "./sampleData.js";
import { createContextPack } from "./services/contextPack.js";
import { extractMemories } from "./services/geminiMemory.js";
import { extractTextFromUpload, normalizeText } from "./services/extractText.js";
import type { MemoryStore } from "./services/memoryStore.js";
import type { ContextFormat, MemorySource, PrivacyScope } from "./types.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const scopes = ["personal", "work", "sensitive", "temporary", "never_export"] as const;
const formats = ["gemini", "claude", "chatgpt", "codex", "json"] as const;

const textSchema = z.object({
  title: z.string().min(1).max(160).default("Pasted Memory"),
  text: z.string().min(1),
  scope: z.enum(scopes).default("personal"),
  tags: z.array(z.string()).default([])
});

const contextPackSchema = z.object({
  format: z.enum(formats).default("gemini"),
  purpose: z.string().min(1).max(400),
  includedScopes: z.array(z.enum(scopes)).default(["personal"]),
  excludedScopes: z.array(z.enum(scopes)).default([])
});

export function createApp(store: MemoryStore) {
  const app = express();
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, storeMode: config.storeMode });
  });

  app.post("/api/sources", upload.single("file"), async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "file is required" });
        return;
      }

      const scope = parseScope(req.body.scope);
      const tags = parseTags(req.body.tags);
      const text = await extractTextFromUpload(req.file.buffer, req.file.mimetype, req.file.originalname);
      const source = await ingestSource(store, {
        title: req.body.title || req.file.originalname,
        text,
        kind: "file",
        mimeType: req.file.mimetype || "application/octet-stream",
        originalName: req.file.originalname,
        scope,
        tags
      });

      res.status(201).json(source);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/memories/text", async (req, res, next) => {
    try {
      const body = textSchema.parse(req.body);
      const source = await ingestSource(store, {
        title: body.title,
        text: normalizeText(body.text),
        kind: "text",
        mimeType: "text/plain",
        scope: body.scope,
        tags: body.tags
      });
      res.status(201).json(source);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/search", async (req, res, next) => {
    try {
      const q = String(req.query.q ?? "");
      const scope = req.query.scope ? parseScope(String(req.query.scope)) : undefined;
      const limit = Math.min(Number(req.query.limit ?? 10), 50);
      const results = await store.search(q, scope, limit);
      await store.addAudit(audit("search", `Searched memories for "${q}"`, { q, scope, resultCount: results.length }));
      res.json({ results });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/context-packs", async (req, res, next) => {
    try {
      const body = contextPackSchema.parse(req.body);
      const facts = await store.getFacts(body.includedScopes);
      const pack = createContextPack({
        format: body.format as ContextFormat,
        purpose: body.purpose,
        facts,
        includedScopes: body.includedScopes as PrivacyScope[],
        excludedScopes: body.excludedScopes as PrivacyScope[]
      });
      await store.saveContextPack(pack);
      await store.addAudit(audit("context_pack", `Created ${pack.format} context pack`, {
        packId: pack.id,
        purpose: pack.purpose,
        memoryCount: pack.memoryIds.length,
        excludedScopes: pack.excludedScopes
      }));
      res.status(201).json(pack);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/audit-log", async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 100);
      res.json({ events: await store.getAuditLog(limit) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/demo/reset", async (req, res, next) => {
    try {
      if (req.headers.authorization !== `Bearer ${config.demoResetToken}`) {
        res.status(401).json({ error: "invalid demo reset token" });
        return;
      }

      await store.reset();
      const ingested = [];
      for (const sample of sampleSources) {
        ingested.push(await ingestSource(store, {
          title: sample.title,
          text: sample.text,
          kind: "text",
          mimeType: "text/plain",
          scope: sample.scope,
          tags: sample.tags
        }));
      }
      await store.addAudit(audit("demo_reset", "Reset and seeded deterministic demo memories", { count: ingested.length }));
      res.json({ ok: true, ingested });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected error";
    res.status(400).json({ error: message });
  });

  return app;
}

async function ingestSource(store: MemoryStore, args: Omit<MemorySource, "id" | "createdAt">) {
  const source: MemorySource = {
    id: `src_${nanoid(10)}`,
    createdAt: new Date().toISOString(),
    ...args
  };

  await store.addSource(source);
  const { facts, wikiPages } = await extractMemories(source);
  await store.addFacts(facts);
  await store.upsertWikiPages(wikiPages);
  await store.addAudit(audit("ingest", `Ingested ${source.title}`, {
    sourceId: source.id,
    scope: source.scope,
    factCount: facts.length,
    wikiPageCount: wikiPages.length
  }));
  await store.addAudit(audit("wiki_update", `Updated LLM Wiki from ${source.title}`, {
    sourceId: source.id,
    pages: wikiPages.map((page) => page.slug)
  }));

  return { source, facts, wikiPages };
}

function parseScope(value: unknown): PrivacyScope {
  if (typeof value === "string" && scopes.includes(value as PrivacyScope)) {
    return value as PrivacyScope;
  }
  return "personal";
}

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

