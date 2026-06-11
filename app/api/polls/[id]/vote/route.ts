import { voteOnPoll } from "@/lib/polls";
import { supabase } from "@/lib/supabase";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params;
    const { optionId, voterId } = await req.json();

    if (!optionId || !voterId) {
      return Response.json(
        { error: "Option ID and Voter ID are required." },
        { status: 400 }
      );
    }

    await voteOnPoll(pollId, optionId, voterId);
    return Response.json({ ok: true });
  } catch (error: any) {
    if (error.code === "23505") {
      // Unique constraint violation (voter already voted on this poll)
      return Response.json({ error: "already voted" }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params;
    const { searchParams } = new URL(req.url);
    const voterId = searchParams.get("voterId");

    if (!voterId) {
      return Response.json(
        { error: "Voter ID is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("voter_id", voterId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
