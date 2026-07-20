import { describe, it, expect } from "vitest";
import { scoreRelevance, type TrackedTopic } from "@/lib/relevance/score";

const topics: TrackedTopic[] = [
  {
    name: "AI & Machine Learning",
    keywords: [
      "ai",
      "artificial intelligence",
      "machine learning",
      "llm",
      "openai",
    ],
    excludedKeywords: ["crypto ai"],
  },
  {
    name: "Developer Tools",
    keywords: ["developer tools", "devtools", "github actions", "cli tool"],
    excludedKeywords: [],
  },
];

describe("scoreRelevance", () => {
  it("scores exact phrase match at +3", () => {
    const result = scoreRelevance(
      "New developer tools for React",
      null,
      null,
      topics
    );
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.matchedTopics).toContain("Developer Tools");
  });

  it("scores keyword in title at +2", () => {
    const result = scoreRelevance(
      "OpenAI releases new model",
      null,
      null,
      topics
    );
    expect(result.score).toBeGreaterThanOrEqual(2);
    expect(result.matchedTopics).toContain("AI & Machine Learning");
  });

  it("scores keyword in body at +1", () => {
    const singleTopic: TrackedTopic[] = [
      { name: "Niche", keywords: ["supabase"], excludedKeywords: [] },
    ];
    const result = scoreRelevance(
      "Interesting new project",
      null,
      "This tool uses supabase under the hood",
      singleTopic
    );
    expect(result.score).toBe(1);
  });

  it("scores keyword in domain at +1", () => {
    const singleTopic: TrackedTopic[] = [
      { name: "Niche", keywords: ["supabase"], excludedKeywords: [] },
    ];
    const result = scoreRelevance(
      "Announcement",
      "https://supabase.com/blog/new-feature",
      null,
      singleTopic
    );
    expect(result.score).toBe(1);
  });

  it("applies -3 for excluded keywords", () => {
    const result = scoreRelevance(
      "New crypto ai trading bot",
      null,
      null,
      topics
    );
    expect(result.score).toBeLessThan(2);
  });

  it("returns zero for irrelevant content", () => {
    const result = scoreRelevance(
      "Best pizza in NYC",
      "https://pizza.com",
      "The best slice you will ever taste",
      topics
    );
    expect(result.score).toBe(0);
    expect(result.matchedTopics).toHaveLength(0);
  });

  it("matches across multiple topics", () => {
    const result = scoreRelevance(
      "OpenAI launches new CLI tool",
      null,
      null,
      topics
    );
    expect(result.matchedTopics).toContain("AI & Machine Learning");
    expect(result.matchedTopics).toContain("Developer Tools");
  });

  it("strips HTML before matching", () => {
    const result = scoreRelevance(
      "Update",
      null,
      "<b>machine learning</b> breakthrough",
      topics
    );
    expect(result.matchedTopics).toContain("AI & Machine Learning");
  });

  it("handles empty topics list", () => {
    const result = scoreRelevance("Anything", null, null, []);
    expect(result.score).toBe(0);
    expect(result.matchedTopics).toHaveLength(0);
  });
});
