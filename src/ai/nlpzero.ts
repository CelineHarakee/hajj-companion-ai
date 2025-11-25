const HF_API_KEY = import.meta.env.VITE_HF_API_KEY || "YOUR_HF_API_KEY_HERE";

// Default model commonly used for zero-shot classification
export const ZERO_SHOT_MODEL = "facebook/bart-large-mnli";

export interface ZeroShotResultLabel {
  label: string;
  score: number;
}

export interface ZeroShotResult {
  sequence: string;
  labels: ZeroShotResultLabel[];
}

/**
 * Calls the Hugging Face Inference API for zero-shot classification.
 *
 * @param inputText - The user message to classify.
 * @param candidateLabels - List of possible labels (intents or categories).
 * @param multiLabel - If true, allows multiple labels to be "true" at once.
 */
export async function runZeroShotClassification(
  inputText: string,
  candidateLabels: string[],
  multiLabel: boolean = true
): Promise<ZeroShotResult> {
  if (!HF_API_KEY || HF_API_KEY === "YOUR_HF_API_KEY_HERE") {
    console.warn(
      "⚠️ No real Hugging Face API key provided. Returning mock classification result."
    );

    // Mock response for demo / academic purposes
    return {
      sequence: inputText,
      labels: candidateLabels.map((label, idx) => ({
        label,
        score: idx === 0 ? 0.85 : 0.15 / Math.max(candidateLabels.length - 1, 1),
      })),
    };
  }

  const endpoint = `https://api-inference.huggingface.co/models/${ZERO_SHOT_MODEL}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: inputText,
        parameters: {
          candidate_labels: candidateLabels,
          multi_label: multiLabel,
        },
      }),
    });

    if (!response.ok) {
      console.error("HF Zero-Shot API error:", response.status, await response.text());
      throw new Error(`HF API error: ${response.status}`);
    }

    const data = await response.json();

    // Hugging Face zero-shot output format:
    // {
    //   "sequence": "...",
    //   "labels": ["label1", "label2", ...],
    //   "scores": [score1, score2, ...]
    // }
    const result: ZeroShotResult = {
      sequence: data.sequence,
      labels: data.labels.map((label: string, idx: number) => ({
        label,
        score: data.scores[idx],
      })),
    };

    return result;
  } catch (err) {
    console.error("Error calling Hugging Face Zero-Shot API:", err);
    // Fallback behavior
    return {
      sequence: inputText,
      labels: candidateLabels.map((label) => ({
        label,
        score: 0,
      })),
    };
  }
}

// ======================================================================
// Helper: classify user intent for Hajj Companion AI
// ======================================================================

/**
 * High-level convenience function to classify a user message into
 * predefined Hajj-related intents.
 *
 * Example labels:
 * - "ritual_question"   -> questions about Tawaf, Sa'i, Arafat, Mina, etc.
 * - "rules_violation"   -> questions about mistakes or invalid actions
 * - "logistics"         -> transport, hotel, timing, crowd, etc.
 * - "emotional_support" -> fear, anxiety, reassurance
 */
export async function classifyHajjIntent(
  message: string
): Promise<ZeroShotResult> {
  const labels = [
    "ritual_question",
    "rules_violation",
    "logistics",
    "emotional_support",
  ];

  return runZeroShotClassification(message, labels, true);
}
