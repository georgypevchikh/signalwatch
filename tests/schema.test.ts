import { describe, it, expect } from "vitest";
import { SignalAnalysisSchema } from "@/lib/ai/schema";

const validAnalysis = {
  relevant: true,
  category: "ai" as const,
  urgency: "high" as const,
  sentiment: "positive" as const,
  confidence: 85,
  summary: "New breakthrough in LLM reasoning",
  whyItMatters: "Could change how AI agents handle complex tasks",
  suggestedAction: "Review paper and assess applicability",
};

describe("SignalAnalysisSchema", () => {
  it("accepts valid analysis", () => {
    const result = SignalAnalysisSchema.safeParse(validAnalysis);
    expect(result.success).toBe(true);
  });

  it("rejects confidence out of range", () => {
    const result = SignalAnalysisSchema.safeParse({
      ...validAnalysis,
      confidence: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative confidence", () => {
    const result = SignalAnalysisSchema.safeParse({
      ...validAnalysis,
      confidence: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = SignalAnalysisSchema.safeParse({
      ...validAnalysis,
      category: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects summary exceeding max length", () => {
    const result = SignalAnalysisSchema.safeParse({
      ...validAnalysis,
      summary: "x".repeat(241),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = SignalAnalysisSchema.safeParse({
      relevant: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts boundary confidence values", () => {
    expect(
      SignalAnalysisSchema.safeParse({ ...validAnalysis, confidence: 0 }).success
    ).toBe(true);
    expect(
      SignalAnalysisSchema.safeParse({ ...validAnalysis, confidence: 100 })
        .success
    ).toBe(true);
  });
});
