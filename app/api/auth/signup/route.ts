import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return Response.json({ error: "Email, password, and name are required." }, { status: 400 });
    }

    // Create and auto-confirm the user in Supabase
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      return Response.json({ error: createError.message }, { status: 500 });
    }

    // Sign in to verify password and create a session
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      return Response.json({ error: loginError.message }, { status: 500 });
    }

    const user = {
      id: userData.user.id,
      email: userData.user.email,
      name: name,
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
