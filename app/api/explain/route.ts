import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  child: "a 5-year-old child with no prior knowledge",
  beginner: "a curious beginner who knows basic concepts",
  intermediate: "someone with some background knowledge",
  expert: "a professional who wants deep technical insights",
};

export async function POST(req: NextRequest) {
  try {
    const { topic, level } = await req.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    if (topic.length > 300) {
      return NextResponse.json(
        { error: "Topic must be under 300 characters" },
        { status: 400 }
      );
    }

    const audience = LEVEL_DESCRIPTIONS[level] || LEVEL_DESCRIPTIONS.beginner;

    const systemPrompt = `You are ELI5 AI, an expert educator who excels at explaining complex topics clearly.
Your job is to explain topics tailored to the audience's level.

CRITICAL: Always respond with ONLY valid JSON. No markdown, no extra text, no code fences.

Return exactly this JSON structure:
{
  "explanation": "A clear, engaging explanation of 3-5 paragraphs tailored to the audience level",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "examples": ["Real-world example 1 with details", "Real-world example 2 with details", "Real-world example 3 with details"],
  "analogy": "A creative, memorable analogy that makes this topic click for the audience",
  "quiz": [
    {"question": "Quiz question 1?", "answer": "Detailed answer to question 1"},
    {"question": "Quiz question 2?", "answer": "Detailed answer to question 2"},
    {"question": "Quiz question 3?", "answer": "Detailed answer to question 3"}
  ],
  "learningPath": [
    {"step": 1, "title": "Step title", "description": "Short description of what to learn/do at this step"},
    {"step": 2, "title": "Step title", "description": "Short description"},
    {"step": 3, "title": "Step title", "description": "Short description"},
    {"step": 4, "title": "Step title", "description": "Short description"},
    {"step": 5, "title": "Step title", "description": "Short description"}
  ]
}

For learningPath: provide 5-7 ordered steps from beginner to advanced.`;

    const userPrompt = `Explain "${topic}" to ${audience}.

Make it engaging, accurate, and perfectly calibrated to their knowledge level. 
Include a memorable analogy and practical examples.
For the learning path, create a realistic progression from total beginner to mastery.
Return ONLY the JSON object, nothing else.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Clean and parse JSON
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.learningPath) parsed.learningPath = [];

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Explain API error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
