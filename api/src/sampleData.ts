import type { PrivacyScope } from "./types.js";

export const sampleSources: Array<{ title: string; text: string; scope: PrivacyScope; tags: string[] }> = [
  {
    title: "Personal Preferences",
    scope: "personal",
    tags: ["personal", "preferences"],
    text: [
      "I prefer morning flights and aisle seats when traveling.",
      "I am vegetarian and like restaurants that clearly label vegetarian options.",
      "I dislike long layovers and usually prefer fewer connections even if the fare is slightly higher.",
      "My writing style should be direct, concrete, and low-hype."
    ].join("\n")
  },
  {
    title: "Travel Notes",
    scope: "personal",
    tags: ["travel"],
    text: [
      "For international trips, keep airport arrival buffers generous.",
      "When planning travel, prioritize walkable neighborhoods and public transit access.",
      "For World Cup travel, I want compact matchday plans that include meals, transit, and backup options."
    ].join("\n")
  },
  {
    title: "Private Health Note",
    scope: "sensitive",
    tags: ["sensitive", "health"],
    text: "Sensitive memory: do not export health or medication details to external agents unless I explicitly ask."
  }
];

