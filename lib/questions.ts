import { supabase } from "@/lib/supabase";

export async function getQuestionsPage(offset: number, limit: number, voterId?: string) {
  const { data, error } = await supabase
    .from("questions")
    .select(`
      id,
      body,
      author,
      created_at,
      votes (
        vote_type,
        voter_id
      )
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit); // inclusive → asks for limit + 1 rows

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((q: any) => {
    const upvotes = (q.votes ?? []).filter((v: any) => v.vote_type === "up").length;
    const downvotes = (q.votes ?? []).filter((v: any) => v.vote_type === "down").length;
    const userVote = (q.votes ?? []).find((v: any) => v.voter_id === voterId)?.vote_type || null;

    return {
      id: q.id,
      body: q.body,
      author: q.author,
      votes: upvotes - downvotes,
      userVote,
    };
  });

  const hasMore = rows.length > limit; // got the extra row? there's a next page
  return { questions: rows.slice(0, limit), hasMore };
}

export async function searchQuestions(q: string, limit: number, voterId?: string) {
  const { data, error } = await supabase
    .from("questions")
    .select(`
      id,
      body,
      author,
      created_at,
      votes (
        vote_type,
        voter_id
      )
    `)
    .textSearch("body", q, { type: "websearch", config: "english" })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const upvotes = (row.votes ?? []).filter((v: any) => v.vote_type === "up").length;
    const downvotes = (row.votes ?? []).filter((v: any) => v.vote_type === "down").length;
    const userVote = (row.votes ?? []).find((v: any) => v.voter_id === voterId)?.vote_type || null;

    return {
      id: row.id,
      body: row.body,
      author: row.author,
      votes: upvotes - downvotes,
      userVote,
    };
  });
}
