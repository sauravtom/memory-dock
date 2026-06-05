import { createApp } from "../app.js";
import { config } from "../config.js";
import { createStore } from "../store.js";
import request from "supertest";

const store = createStore();
await store.init();
const app = createApp(store);

const response = await request(app)
  .post("/api/demo/reset")
  .set("Authorization", `Bearer ${config.demoResetToken}`)
  .send();

if (response.status >= 400) {
  console.error(response.body);
  process.exit(1);
}

console.log(JSON.stringify(response.body, null, 2));

