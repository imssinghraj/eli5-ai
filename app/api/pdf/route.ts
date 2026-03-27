import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 5MB" },
        { status: 400 }
      );
    }

    // Extract text from PDF using pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse PDF. The file may be corrupted or encrypted." },
        { status: 400 }
      );
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Could not extract meaningful text from this PDF. It may be an image-based PDF.",
        },
        { status: 400 }
      );
    }

    // Truncate to avoid token limits
    const truncated = extractedText.slice(0, 6000);

    const systemPrompt = `You are ELI5 AI, an expert at reading documents and making them easy to understand.
Analyze the provided document text and create a comprehensive, easy-to-understand breakdown.

CRITICAL: Always respond with ONLY valid JSON. No markdown, no code fences, no extra text.

Return exactly this JSON structure:
{
  "title": "A concise title for this document",
  "summary": "A clear 2-3 paragraph summary of the main content",
  "keyPoints": ["Key insight 1", "Key insight 2", "Key insight 3", "Key insight 4", "Key insight 5"],
  "explanation": "An ELI5 explanation of the core concepts, written simply and clearly",
  "topics": ["Topic 1", "Topic 2", "Topic 3"],
  "difficulty": "beginner|intermediate|advanced"
}`;

    const userPrompt = `Here is the document text to analyze:\n\n${truncated}\n\nProvide a comprehensive breakdown. Return ONLY the JSON object.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      ...parsed,
      charCount: extractedText.length,
      wordCount: extractedText.split(/\s+/).length,
    });
  } catch (error: unknown) {
    console.error("PDF API error:", error);
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
