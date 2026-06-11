import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HubContainer from "./hub-container";
import { getQuestionsPage } from "@/lib/questions";

// Render on every request (don't cache/prerender) so new questions show up.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

// Server component — runs only on the server, awaits the data, renders to HTML.
export default async function Page() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");

  if (!sessionCookie) {
    redirect("/login");
  }

  let user;
  try {
    user = JSON.parse(sessionCookie.value);
  } catch (e) {
    redirect("/login");
  }

  // Pass user.id as voterId to get initial vote states
  const { questions, hasMore } = await getQuestionsPage(0, PAGE_SIZE, user.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <HubContainer user={user} initialQuestions={questions} initialHasMore={hasMore} />
    </main>
  );
}
