import { redirect } from "next/navigation";
import { authErrors } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error: errorCode } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (!error && data?.claims && !errorCode) {
    const { data: allowed } = await supabase.rpc("can_access_admin");
    if (allowed === true) redirect("/");
  }

  return (
    <main className="login-shell">
      <section aria-labelledby="login-heading" className="login-card">
        <p className="eyebrow">Reality Check</p>
        <h1 id="login-heading">Admin Mode</h1>
        <p className="login-copy">Sign in with an approved superadmin account to manage generation, users, and content.</p>
        <LoginForm initialError={errorCode && Object.hasOwn(authErrors, errorCode) ? authErrors[errorCode] : undefined} />
      </section>
    </main>
  );
}

