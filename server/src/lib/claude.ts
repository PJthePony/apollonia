import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface CategorizationResult {
  category: "personal" | "professional" | "family" | "acquaintance";
  subcategory: string | null;
  confidence: number;
}

/**
 * Use Claude to categorize a contact based on their email, name,
 * sender summary, and known facts.
 */
export async function categorizeContact(input: {
  email: string;
  displayName: string;
  company: string | null;
  title: string | null;
  senderSummary: string | null;
  facts: string[];
}): Promise<CategorizationResult> {
  const factsText = input.facts.length > 0
    ? `Known facts:\n${input.facts.map((f) => `- ${f}`).join("\n")}`
    : "No known facts.";

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 256,
    tools: [
      {
        name: "categorize_contact",
        description: "Categorize a contact into a relationship category",
        input_schema: {
          type: "object" as const,
          properties: {
            category: {
              type: "string",
              enum: ["personal", "professional", "family", "acquaintance"],
              description: "The primary relationship category",
            },
            subcategory: {
              type: "string",
              nullable: true,
              description:
                "Optional subcategory: close_friend, colleague, client, mentor, vendor, neighbor, etc.",
            },
            confidence: {
              type: "number",
              description: "Confidence score 0.0-1.0",
            },
          },
          required: ["category", "confidence"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "categorize_contact" },
    messages: [
      {
        role: "user",
        content: `Categorize this contact for a personal CRM. This is P.J.'s network — categorize from his perspective.

Contact: ${input.displayName} <${input.email}>
${input.company ? `Company: ${input.company}` : ""}
${input.title ? `Title: ${input.title}` : ""}
${input.senderSummary ? `Relationship summary: ${input.senderSummary}` : ""}
${factsText}

Categories:
- personal: Friends, social connections
- professional: Work contacts, clients, colleagues, vendors
- family: Family members, relatives
- acquaintance: Loose connections, met once, newsletter-style contacts`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { category: "acquaintance", subcategory: null, confidence: 0.3 };
  }

  const result = toolUse.input as {
    category: string;
    subcategory?: string;
    confidence: number;
  };

  return {
    category: result.category as CategorizationResult["category"],
    subcategory: result.subcategory ?? null,
    confidence: result.confidence,
  };
}
