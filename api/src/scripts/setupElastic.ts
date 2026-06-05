import { createStore } from "../store.js";

const store = createStore();
await store.init();
console.log("Elastic indices are ready.");

