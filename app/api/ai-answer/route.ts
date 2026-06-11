import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Answer the user's question clearly and concisely in 2–4 sentences. Be accurate, informative, and direct.",
          },
          {
            role: "user",
            content: question,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Groq API error:", errData);
      return NextResponse.json(
        { error: errData?.error?.message || "AI request failed." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const answer =
      data?.choices?.[0]?.message?.content?.trim() ??
      "No answer could be generated.";

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("AI answer error:", err);
    return NextResponse.json(
      { error: "Failed to generate AI answer." },
      { status: 500 }
    );
  }
}
