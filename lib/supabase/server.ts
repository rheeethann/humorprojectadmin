import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// A separate cookie name keeps the admin session apart from the main app's,
// even on localhost where cookies are shared across ports.
export const adminCookieName = "sb-humorproject-admin-auth";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { name: adminCookieName },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. Proxy handles refreshes.
          }
        },
      },
    },
  );
}
