"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSiteUrl } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  let providerUrl: string;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getSiteUrl()}/auth/callback`,
        skipBrowserRedirect: true,
        // Always show Google's account chooser, even with an existing Google or app session.
        queryParams: { prompt: "select_account" },
      },
    });
    if (error || !data.url) throw new Error("OAuth initialization failed");
    providerUrl = data.url;
  } catch {
    return { error: "We couldn’t connect to Google sign-in. Please try again." };
  }

  redirect(providerUrl);
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/?error=signout");
  revalidatePath("/", "layout");
  redirect("/login");
}

