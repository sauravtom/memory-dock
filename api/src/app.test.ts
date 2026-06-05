import request from "supertest";
import { describe, expect, it, beforeEach } from "vitest";
import { createApp } from "./app.js";
import { LocalMemoryStore } from "./services/localStore.js";

const store = new LocalMemoryStore();
const app = createApp(store);

beforeEach(async () => {
  await store.reset();
});

describe("Memory Dock API", () => {
  it("ingests pasted memory and searches it", async () => {
    const ingest = await request(app)
      .post("/api/memories/text")
      .send({
        title: "Travel Preferences",
        text: "I prefer morning flights and vegetarian restaurants while traveling.",
        scope: "personal",
        tags: ["travel"]
      });

    expect(ingest.status).toBe(201);
    expect(ingest.body.facts.length).toBeGreaterThan(0);

    const search = await request(app).get("/api/search?q=morning%20flights&scope=personal");
    expect(search.status).toBe(200);
    expect(search.body.results.some((result: { snippet: string }) => result.snippet.includes("morning flights"))).toBe(true);
  });

  it("excludes sensitive and never_export facts from context packs", async () => {
    await request(app)
      .post("/api/memories/text")
      .send({
        title: "Safe Preference",
        text: "I prefer concise writing with concrete examples.",
        scope: "personal"
      });

    await request(app)
      .post("/api/memories/text")
      .send({
        title: "Sensitive Note",
        text: "Sensitive memory: do not export medication details.",
        scope: "sensitive"
      });

    const pack = await request(app)
      .post("/api/context-packs")
      .send({
        format: "claude",
        purpose: "Help a writing assistant adapt to my style.",
        includedScopes: ["personal", "sensitive"]
      });

    expect(pack.status).toBe(201);
    expect(pack.body.content).toContain("concise writing");
    expect(pack.body.content).not.toContain("medication");
    expect(pack.body.excludedScopes).toContain("sensitive");
  });

  it("seeds deterministic demo data", async () => {
    const reset = await request(app)
      .post("/api/demo/reset")
      .set("Authorization", "Bearer memory-dock-demo")
      .send();

    expect(reset.status).toBe(200);
    expect(reset.body.ingested.length).toBe(3);

    const audit = await request(app).get("/api/audit-log");
    expect(audit.status).toBe(200);
    expect(audit.body.events.length).toBeGreaterThan(0);
  });
});

