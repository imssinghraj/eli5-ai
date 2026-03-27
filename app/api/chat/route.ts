import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message, topic, level, recentExchanges } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: "Message must be under 500 characters" },
        { status: 500 }
      );
    }

    // Build a concise context from only the most recent 4 exchanges
    // This prevents context bloat and repetition
    const trimmedHistory = Array.isArray(recentExchanges)
      ? recentExchanges.slice(-4)
      : [];

    const historyContext =
      trimmedHistory.length > 0
        ? trimmedHistory
            .map(
              (ex: { role: string; content: string }) =>
                `${ex.role === "user" ? "User" : "Assistant"}: ${ex.content}`
            )
            .join("\n")
        : "";

    const systemPrompt = `You are ELI5 AI, a brilliant follow-up assistant helping users understand "${topic || "a topic"}" at ${level || "beginner"} level.

CRITICAL RULES - FOLLOW STRICTLY:
1. NEVER repeat or rephrase anything from previous answers
2. ALWAYS provide NEW information, perspectives, or insights
3. Build upon what was discussed but go DEEPER or WIDER
4. If asked the same question, tackle it from a completely different angle
5. Keep answers focused, concise (2-4 paragraphs max), and genuinely helpful
6. Use examples, analogies, or comparisons the user hasn't seen yet
7. If unsure what's new, explicitly say "To add something new..." and pivot

Conversation style: Direct, insightful, conversational. No fluff.`;

    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (historyContext) {
      messages.push({
        role: "user",
        content: `Recent conversation context (DO NOT repeat these points):\n${historyContext}\n\nNew question: ${message}`,
      });
    } else {
      messages.push({
        role: "user",
        content: `Question about "${topic || "this topic"}": ${message}`,
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      max_tokens: 800,
      temperature: 0.75,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: content });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
