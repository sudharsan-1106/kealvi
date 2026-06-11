import { supabase } from "@/lib/supabase";

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  author: string | null;
  createdAt: string;
  options: PollOption[];
  userVotedOptionId: string | null;
}

export async function getPolls(voterId?: string): Promise<Poll[]> {
  const { data: pollsData, error: pollsError } = await supabase
    .from("polls")
    .select(`
      id,
      question,
      author,
      created_at,
      poll_options (
        id,
        option_text,
        poll_votes (count)
      )
    `)
    .order("created_at", { ascending: false });

  if (pollsError) {
    throw new Error(pollsError.message);
  }

  let userVotes: Record<string, string> = {};
  if (voterId) {
    const { data: votesData, error: votesError } = await supabase
      .from("poll_votes")
      .select("poll_id, option_id")
      .eq("voter_id", voterId);

    if (!votesError && votesData) {
      votesData.forEach((v: any) => {
        userVotes[v.poll_id] = v.option_id;
      });
    }
  }

  return (pollsData ?? []).map((poll: any) => {
    return {
      id: poll.id,
      question: poll.question,
      author: poll.author,
      createdAt: poll.created_at,
      options: (poll.poll_options ?? []).map((opt: any) => ({
        id: opt.id,
        text: opt.option_text,
        votes: opt.poll_votes?.[0]?.count ?? 0,
      })),
      userVotedOptionId: userVotes[poll.id] || null,
    };
  });
}

export async function createPoll(
  question: string,
  options: string[],
  author?: string
): Promise<Poll> {
  const { data: pollData, error: pollError } = await supabase
    .from("polls")
    .insert({ question, author })
    .select()
    .single();

  if (pollError) {
    throw new Error(pollError.message);
  }

  const optionsToInsert = options.map((text) => ({
    poll_id: pollData.id,
    option_text: text,
  }));

  const { data: optionsData, error: optionsError } = await supabase
    .from("poll_options")
    .insert(optionsToInsert)
    .select();

  if (optionsError) {
    await supabase.from("polls").delete().eq("id", pollData.id);
    throw new Error(optionsError.message);
  }

  return {
    id: pollData.id,
    question: pollData.question,
    author: pollData.author,
    createdAt: pollData.created_at,
    options: (optionsData ?? []).map((opt: any) => ({
      id: opt.id,
      text: opt.option_text,
      votes: 0,
    })),
    userVotedOptionId: null,
  };
}

export async function voteOnPoll(
  pollId: string,
  optionId: string,
  voterId: string
): Promise<void> {
  const { error } = await supabase
    .from("poll_votes")
    .upsert(
      {
        poll_id: pollId,
        option_id: optionId,
        voter_id: voterId,
      },
      { onConflict: "poll_id, voter_id" }
    );

  if (error) {
    throw error;
  }
}
