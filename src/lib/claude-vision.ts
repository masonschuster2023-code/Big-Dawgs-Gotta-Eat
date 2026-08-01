// Server-only client for Claude's vision API. Never import this from a
// client component — ANTHROPIC_API_KEY has no NEXT_PUBLIC_ prefix so it
// can't be bundled to the browser, but importing this file from client code
// would still break the build.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Sonnet is the right balance here: strong enough for reliable nutrition
// label OCR and portion estimation, without paying Opus rates on a feature
// that fires on every photo a user logs.
const MODEL = "claude-sonnet-5";

export type PhotoConfidence = "label" | "estimate";

export interface PhotoFoodItem {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: PhotoConfidence;
}

const PROMPT = `You are analyzing a food photo for a calorie-tracking app.

Return ONLY a JSON array, no prose, no markdown code fences. Each element must have exactly this shape:
{"name": string, "grams": number, "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": "label" | "estimate"}

Rules:
- If a nutrition facts label is visible and legible in the photo, read the exact values from it for the serving size shown, and set confidence to "label".
- If there is no legible label, estimate the food item, a reasonable portion size in grams based on visual size, and typical macros for that food and portion, and set confidence to "estimate".
- If the photo shows multiple distinct food items (e.g. a full plate), return one array element per item.
- If you cannot identify any food in the image (blurry, no food visible, unrelated subject), return an empty array: []
- calories/protein/carbs/fat must be the totals for the stated "grams" amount, not per 100g.
- All numeric fields are JSON numbers, never strings.`;

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey });
}

function parseItems(raw: string): PhotoFoodItem[] {
  // Defensive: strip markdown code fences if the model adds them despite
  // being told not to.
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error("Couldn't read that photo — try again with a clearer shot.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Couldn't read that photo — try again with a clearer shot.");
  }

  return parsed.map((item) => {
    const it = item as Record<string, unknown>;
    return {
      name: typeof it.name === "string" && it.name ? it.name : "Unknown food",
      grams: Number(it.grams) || 0,
      calories: Number(it.calories) || 0,
      protein: Number(it.protein) || 0,
      carbs: Number(it.carbs) || 0,
      fat: Number(it.fat) || 0,
      confidence: it.confidence === "label" ? "label" : "estimate",
    };
  });
}

export async function analyzePhotoForFood(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<PhotoFoodItem[]> {
  const anthropic = client();

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No response from model");
  }

  return parseItems(textBlock.text);
}
