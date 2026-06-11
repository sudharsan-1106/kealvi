import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  // Delete the session cookie
  cookieStore.delete("user_session");
  return Response.json({ ok: true });
}
