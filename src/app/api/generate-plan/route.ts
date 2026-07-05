import { NextRequest, NextResponse } from "next/server";

// This code runs on the SERVER, not in the browser - so your GEMINI_API_KEY
// stays secret and is never visible to website visitors.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goal, experience, daysPerWeek, equipment, notes } = body;

    // Prompt engineering: give the model a clear role, the member's specific
    // inputs, and a strict output format so our app can reliably parse it.
    const prompt = `You are an expert certified personal trainer creating a personalized workout and nutrition plan for a gym member.

Member details:
- Primary goal: ${goal}
- Experience level: ${experience}
- Available training days per week: ${daysPerWeek}
- Available equipment: ${equipment}
- Additional notes: ${notes || "None"}

Create a structured weekly workout plan and brief nutrition guidance appropriate for their experience level. Respond with ONLY valid JSON — no markdown formatting, no code fences, no extra commentary — matching exactly this shape:

{
  "summary": "one short paragraph overview of the plan and the approach behind it",
  "days": [
    {
      "day": "Monday",
      "focus": "e.g. Upper Body Strength",
      "exercises": [
        { "name": "Exercise name", "sets": 3, "reps": "8-10", "notes": "brief form or intensity cue" }
      ]
    }
  ],
  "nutritionTips": ["short actionable tip", "short actionable tip", "short actionable tip"]
}

Only include actual training days in "days" (matching the number of days per week they specified). Keep exercises realistic for their equipment and safe for their experience level.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
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
      console.error("Gemini API error:", errText);
      return NextResponse.json(
        { error: "The AI coach couldn't generate a plan right now. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // The model sometimes wraps JSON in ```json fences despite instructions -
    // strip those out just in case before parsing.
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const plan = JSON.parse(cleaned);

    return NextResponse.json({ plan });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong generating your plan." },
      { status: 500 }
    );
  }
}
