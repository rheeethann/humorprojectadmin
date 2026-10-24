import { NextResponse, type NextRequest } from "next/server";
import { getSiteUrl, namesFromGoogle } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  function finish(path: string) {
    const response = NextResponse.redirect(new URL(path, getSiteUrl()));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (params.has("error")) return finish("/login?error=cancelled");
  const code = params.get("code");
  if (!code) return finish("/login?error=callback");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return finish("/login?error=callback");

  const { data: allowed, error: accessError } = await supabase.rpc("member_allowed");
  if (accessError || !allowed || !data.user.email) {
    await supabase.auth.signOut({ scope: "local" });
    return finish("/login?error=domain");
  }

  // The SQL trigger creates the profile; fill in names for people who sign in here first.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update(namesFromGoogle(data.user.user_metadata, data.user.email))
    .eq("id", data.user.id)
    .select("id")
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut({ scope: "local" });
    return finish("/login?error=profile");
  }

  return finish("/");
}

