import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 8080),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  storeMode: (process.env.STORE_MODE ?? "local").toLowerCase(),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  elasticsearchNode: process.env.ELASTICSEARCH_NODE ?? "",
  elasticsearchApiKey: process.env.ELASTICSEARCH_API_KEY ?? "",
  elasticIndexPrefix: process.env.ELASTIC_INDEX_PREFIX ?? "memory",
  demoResetToken: process.env.DEMO_RESET_TOKEN ?? "memory-dock-demo"
};

export function requireElasticConfig() {
  if (!config.elasticsearchNode || !config.elasticsearchApiKey) {
    throw new Error("ELASTICSEARCH_NODE and ELASTICSEARCH_API_KEY are required when STORE_MODE=elastic");
  }
}

