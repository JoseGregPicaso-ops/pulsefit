// "Embedding" a piece of text means converting it into a list of numbers
// (a vector) that represents its MEANING. Texts with similar meaning end up
// with similar vectors - even if they don't share any of the same words.
// That's what lets us search by meaning instead of exact keyword matching.

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export async function embedText(text: string, taskType: TaskType): Promise<number[]> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY || "",
      },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API error: ${errText}`);
  }

  const data = await response.json();
  return data.embedding.values as number[];
}

// Cosine similarity: a standard way to measure how "close" two vectors are
// in meaning. Returns a number from -1 (opposite) to 1 (identical meaning).
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
