import { z } from "zod";

export const SignalAnalysisSchema = z.object({
  relevant: z.boolean(),
  category: z.enum([
    "ai",
    "automation",
    "developer_tools",
    "security",
    "other",
  ]),
  urgency: z.enum(["low", "medium", "high"]),
  sentiment: z.enum(["negative", "neutral", "positive", "mixed"]),
  confidence: z.number().int().min(0).max(100),
  summary: z.string().max(240),
  whyItMatters: z.string().max(320),
  suggestedAction: z.string().max(240),
});

export type SignalAnalysis = z.infer<typeof SignalAnalysisSchema>;

export const signalAnalysisJsonSchema = {
  type: "object" as const,
  properties: {
    relevant: { type: "boolean" as const },
    category: {
      type: "string" as const,
      enum: ["ai", "automation", "developer_tools", "security", "other"],
    },
    urgency: { type: "string" as const, enum: ["low", "medium", "high"] },
    sentiment: {
      type: "string" as const,
      enum: ["negative", "neutral", "positive", "mixed"],
    },
    confidence: {
      type: "integer" as const,
      minimum: 0,
      maximum: 100,
    },
    summary: { type: "string" as const, maxLength: 240 },
    whyItMatters: { type: "string" as const, maxLength: 320 },
    suggestedAction: { type: "string" as const, maxLength: 240 },
  },
  required: [
    "relevant",
    "category",
    "urgency",
    "sentiment",
    "confidence",
    "summary",
    "whyItMatters",
    "suggestedAction",
  ],
  additionalProperties: false,
};
