import { getPolls, createPoll } from "@/lib/polls";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const voterId = searchParams.get("voterId")?.trim() || undefined;

  try {
    const polls = await getPolls(voterId);
    return Response.json({ polls });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { question, options, author } = await req.json();

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return Response.json(
        { error: "A poll must have a question and at least 2 options." },
        { status: 400 }
      );
    }

    const cleanedOptions = options.map((opt: string) => opt.trim()).filter(Boolean);
    if (cleanedOptions.length < 2) {
      return Response.json(
        { error: "At least 2 non-empty options are required." },
        { status: 400 }
      );
    }

    const poll = await createPoll(question.trim(), cleanedOptions, author?.trim() || null);
    return Response.json(poll);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
