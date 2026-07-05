import { NextRequest, NextResponse } from "next/server";
import { knowledgeBase } from "@/lib/knowledgeBase";
import { embedText, cosineSimilarity } from "@/lib/embeddings";

// We cache the knowledge base embeddings in memory so we don't recompute them
// on every single chat message - only the first time this server process
// handles a request. (In a larger production app, you'd instead compute
// these once offline and store them in a database - a nice future upgrade,
// but overkill for a project this size.)
let cachedKnowledgeEmbeddings: { id: string; text: string; vector: number[] }[] | null = null;

async function getKnowledgeEmbeddings() {
  if (cachedKnowledgeEmbeddings) return cachedKnowledgeEmbeddings;

  cachedKnowledgeEmbeddings = await Promise.all(
    knowledgeBase.map(async (entry) => ({
      id: entry.id,
      text: entry.text,
      vector: await embedText(entry.text, "RETRIEVAL_DOCUMENT"),
    }))
  );
  return cachedKnowledgeEmbeddings;
}

export async function POST(req: NextRequest) {
  try {
    const { question, history } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "A question is required." }, { status: 400 });
    }

    // STEP 1: RETRIEVAL - find the most relevant facts for this question
    const knowledge = await getKnowledgeEmbeddings();
    const questionVector = await embedText(question, "RETRIEVAL_QUERY");

    const ranked = knowledge
      .map((entry) => ({
        ...entry,
        score: cosineSimilarity(questionVector, entry.vector),
      }))
      .sort((a, b) => b.score - a.score);

    const topMatches = ranked.slice(0, 3);
    const context = topMatches.map((m) => `- ${m.text}`).join("\n");

    // STEP 2: GENERATION - ask Gemini to answer using only the retrieved facts
    const recentHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .map((m: { role: string; text: string }) => `${m.role === "user" ? "Member" : "Coach"}: ${m.text}`)
          .join("\n")
      : "";

    const prompt = `You are PulseFit's friendly AI gym coach, answering a member's question in the app's chat.

Only use the facts below to answer. If the facts don't cover the question, say you're not sure and suggest they ask staff at the front desk - do not make up gym-specific details (hours, policies, pricing, etc).

Relevant facts:
${context}

${recentHistory ? `Recent conversation:\n${recentHistory}\n` : ""}
Member's question: ${question}

Answer in 2-4 friendly, concise sentences.`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY || "",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini generateContent error:", errText);
      return NextResponse.json(
        { error: "The coach couldn't respond right now. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return NextResponse.json({
      answer: answer.trim(),
      // Returning which facts were used is great for showing HOW the RAG
      // pipeline works - useful to point at during an interview demo.
      sources: topMatches.map((m) => ({ id: m.id, score: Number(m.score.toFixed(3)) })),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
