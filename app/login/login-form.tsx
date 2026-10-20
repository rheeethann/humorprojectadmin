"use client";

import { useActionState } from "react";
import { signInWithGoogle } from "@/app/auth/actions";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, pending] = useActionState(signInWithGoogle, { error: "" });
  const error = state.error || initialError;

  return (
    <form action={formAction} className="login-form" aria-busy={pending}>
      {error && <p role="alert" className="form-message error">{error}</p>}
      <button type="submit" disabled={pending} className="primary-button google-button">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36ZM12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.61 0-4.82-1.76-5.61-4.12H3.04v2.59A10 10 0 0 0 12 22ZM6.39 13.92a6 6 0 0 1 0-3.84V7.49H3.04a10 10 0 0 0 0 9.02l3.35-2.59ZM12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.49l3.35 2.59C7.18 7.72 9.39 5.96 12 5.96Z" />
        </svg>
        {pending ? "Redirecting to Google…" : "Continue with Google"}
      </button>
      <p className="login-note">Admin Mode always asks you to sign in with Google, even if you’re signed in to the app.</p>
    </form>
  );
}
