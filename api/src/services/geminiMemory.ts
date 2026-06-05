import { GoogleGenAI } from "@google/genai";
import { nanoid } from "nanoid";
import { config } from "../config.js";
import type { MemoryFact, MemorySource, PrivacyScope, WikiPage } from "../types.js";

interface ExtractedFact {
  value: string;
  category: MemoryFact["category"];
  confidence: number;
  tags: string[];
  scope?: PrivacyScope;
}

interface GeminiExtraction {
  facts: ExtractedFact[];
  wikiUpdates: Array<{
    slug: string;
    title: string;
    body: string;
  }>;
}

const defaultWikiSlugs = ["profile", "preferences", "people", "projects", "travel", "contradictions", "index", "log"];

export async function extractMemories(source: MemorySource): Promise<{ facts: MemoryFact[]; wikiPages: WikiPage[] }> {
  const now = new Date().toISOString();
  const extracted = config.geminiApiKey ? await extractWithGemini(source) : extractDeterministically(source);

  const facts = extracted.facts.map((fact) => ({
    id: `fact_${nanoid(10)}`,
    sourceId: source.id,
    value: fact.value,
    category: fact.category,
    scope: fact.scope ?? source.scope,
    confidence: clampConfidence(fact.confidence),
    tags: [...new Set([...(source.tags ?? []), ...(fact.tags ?? [])])],
    createdAt: now
  }));

  const wikiPages = buildWikiPages(source, facts, extracted.wikiUpdates, now);
  return { facts, wikiPages };
}

async function extractWithGemini(source: MemorySource): Promise<GeminiExtraction> {
  const client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const prompt = [
    "You maintain a private LLM Wiki for portable agent memory.",
    "Extract durable memories from this source. Prefer stable facts, preferences, constraints, projects, people, travel details, and decisions.",
    "Do not invent facts. Mark sensitive information as sensitive or never_export if it should not leave the vault.",
    "Return strict JSON with keys facts and wikiUpdates.",
    "facts[] fields: value, category, confidence, tags, optional scope.",
    "wikiUpdates[] fields: slug, title, body. Use markdown body.",
    "",
    `Source title: ${source.title}`,
    `Default scope: ${source.scope}`,
    `Source text:\n${source.text.slice(0, 18000)}`
  ].join("\n");

  const response = await client.models.generateContent({
    model: config.geminiModel,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  const raw = response.text ?? "{}";
  try {
    const parsed = JSON.parse(raw) as GeminiExtraction;
    return {
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      wikiUpdates: Array.isArray(parsed.wikiUpdates) ? parsed.wikiUpdates : []
    };
  } catch {
    return extractDeterministically(source);
  }
}

function extractDeterministically(source: MemorySource): GeminiExtraction {
  const sentences = source.text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 16);

  const facts: ExtractedFact[] = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    return {
      value: sentence,
      category: categorize(lower),
      confidence: 0.74,
      tags: inferTags(lower),
      scope: source.scope
    };
  });

  return {
    facts,
    wikiUpdates: [
      {
        slug: "index",
        title: "Memory Index",
        body: `- [[${slugify(source.title)}]] ${source.title}: ${source.text.slice(0, 180)}`
      },
      {
        slug: inferPrimaryWikiSlug(facts),
        title: titleForSlug(inferPrimaryWikiSlug(facts)),
        body: facts.map((fact) => `- ${fact.value}`).join("\n")
      },
      {
        slug: "log",
        title: "Memory Log",
        body: `## [${new Date().toISOString()}] ingest | ${source.title}\nProcessed ${facts.length} extracted memories from ${source.kind}.`
      }
    ]
  };
}

function buildWikiPages(source: MemorySource, facts: MemoryFact[], updates: GeminiExtraction["wikiUpdates"], now: string): WikiPage[] {
  const pages = updates.length > 0 ? updates : [];
  const normalized = pages
    .filter((page) => page.slug && page.body)
    .map((page) => ({
      id: `wiki_${slugify(page.slug)}`,
      slug: slugify(page.slug),
      title: page.title || titleForSlug(page.slug),
      body: page.body,
      sourceIds: [source.id],
      updatedAt: now
    }));

  const missingDefaults = defaultWikiSlugs
    .filter((slug) => !normalized.some((page) => page.slug === slug))
    .map((slug) => ({
      id: `wiki_${slug}`,
      slug,
      title: titleForSlug(slug),
      body: slug === "log"
        ? `## [${now}] ingest | ${source.title}\nProcessed ${facts.length} memories.`
        : "",
      sourceIds: [source.id],
      updatedAt: now
    }));

  return [...normalized, ...missingDefaults].filter((page) => page.body.trim().length > 0);
}

function categorize(lower: string): MemoryFact["category"] {
  if (lower.includes("prefer") || lower.includes("like") || lower.includes("hate")) return "preference";
  if (lower.includes("flight") || lower.includes("hotel") || lower.includes("travel") || lower.includes("trip")) return "travel";
  if (lower.includes("project") || lower.includes("repo") || lower.includes("startup")) return "project";
  if (lower.includes("decided") || lower.includes("decision")) return "decision";
  if (lower.includes("must") || lower.includes("never") || lower.includes("constraint")) return "constraint";
  return "other";
}

function inferTags(lower: string): string[] {
  const tags = new Set<string>();
  for (const tag of ["travel", "food", "writing", "work", "personal", "project", "privacy", "world-cup"]) {
    if (lower.includes(tag.replace("-", " "))) tags.add(tag);
  }
  return [...tags];
}

function inferPrimaryWikiSlug(facts: ExtractedFact[]): string {
  const categories = facts.map((fact) => fact.category);
  if (categories.includes("travel")) return "travel";
  if (categories.includes("preference")) return "preferences";
  if (categories.includes("project")) return "projects";
  return "profile";
}

function titleForSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0.6;
  return Math.max(0, Math.min(1, value));
}

