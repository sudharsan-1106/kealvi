import { supabase } from "@/lib/supabase";

// We don't check-then-insert (that has a time-of-check-to-time-of-use race).
// We just try to insert and let the unique(question_id, voter_id) constraint
// be the referee — it's enforced atomically as part of the insert.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;
  const { voterId, voteType } = await req.json(); // voteType: 'up' | 'down' | null

  if (!voterId) {
    return Response.json({ error: "Voter ID is required." }, { status: 400 });
  }

  if (voteType === null) {
    // Cancel vote
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("question_id", questionId)
      .eq("voter_id", voterId);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Upsert vote
    const { error } = await supabase
      .from("votes")
      .upsert(
        { question_id: questionId, voter_id: voterId, vote_type: voteType },
        { onConflict: "question_id, voter_id" }
      );

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}
