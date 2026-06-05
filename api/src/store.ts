import { config } from "./config.js";
import { ElasticMemoryStore } from "./services/elasticStore.js";
import { LocalMemoryStore } from "./services/localStore.js";
import type { MemoryStore } from "./services/memoryStore.js";

export function createStore(): MemoryStore {
  if (config.storeMode === "elastic") {
    return new ElasticMemoryStore();
  }
  return new LocalMemoryStore();
}

