import { createApp } from "./app.js";
import { config } from "./config.js";
import { createStore } from "./store.js";

const store = createStore();
await store.init();

const app = createApp(store);
app.listen(config.port, () => {
  console.log(`Memory Dock API listening on :${config.port} (${config.storeMode} store)`);
});

