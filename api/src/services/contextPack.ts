import { nanoid } from "nanoid";
import type { ContextFormat, ContextPack, MemoryFact, PrivacyScope } from "../types.js";

const nonExportableScopes: PrivacyScope[] = ["sensitive", "never_export"];

export function createContextPack(args: {
  format: ContextFormat;
  purpose: string;
  facts: MemoryFact[];
  includedScopes: PrivacyScope[];
  excludedScopes?: PrivacyScope[];
}): ContextPack {
  const excludedScopes = [...new Set([...(args.excludedScopes ?? []), ...nonExportableScopes])];
  const allowedFacts = args.facts.filter((fact) => {
    return args.includedScopes.includes(fact.scope) && !excludedScopes.includes(fact.scope);
  });

  const now = new Date().toISOString();
  return {
    id: `pack_${nanoid(10)}`,
    format: args.format,
    purpose: args.purpose,
    includedScopes: args.includedScopes,
    excludedScopes,
    content: renderContextPack(args.format, args.purpose, allowedFacts, excludedScopes),
    memoryIds: allowedFacts.map((fact) => fact.id),
    createdAt: now
  };
}

function renderContextPack(format: ContextFormat, purpose: string, facts: MemoryFact[], excludedScopes: PrivacyScope[]): string {
  if (format === "json") {
    return JSON.stringify({ purpose, excludedScopes, memories: facts }, null, 2);
  }

  const title = {
    gemini: "Gemini Context Pack",
    claude: "Claude Context Pack",
    chatgpt: "ChatGPT Context Pack",
    codex: "Codex Context Pack"
  }[format];

  const instructions = {
    gemini: "Use these memories as user-owned context. Do not assume omitted sensitive context.",
    claude: "Treat this as portable memory supplied by the user. Cite memory IDs when using durable facts.",
    chatgpt: "Use this context to personalize the session while respecting the excluded scopes.",
    codex: "Use these project and user preferences as persistent context. Do not write private facts unless asked."
  }[format];

  const body = facts
    .map((fact) => `- [${fact.id}] (${fact.category}, ${fact.scope}, confidence ${fact.confidence.toFixed(2)}) ${fact.value}`)
    .join("\n");

  return [
    `# ${title}`,
    "",
    `Purpose: ${purpose}`,
    "",
    instructions,
    "",
    `Excluded scopes: ${excludedScopes.join(", ")}`,
    "",
    "## Memories",
    body || "No exportable memories matched this request."
  ].join("\n");
}

