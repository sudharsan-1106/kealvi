import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }

    // Authenticate with Supabase Auth
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      return Response.json({ error: loginError.message }, { status: 401 });
    }

    // Try to get name from metadata, fallback to email prefix
    const name = sessionData.user?.user_metadata?.name || sessionData.user?.email?.split("@")[0] || "User";

    const user = {
      id: sessionData.user?.id,
      email: sessionData.user?.email,
      name,
    };

    // Set HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set("user_session", JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return Response.json({ user });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
