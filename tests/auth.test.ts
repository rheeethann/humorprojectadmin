import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() };
  return {
    query,
    supabase: {
      auth: { exchangeCodeForSession: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn() },
      from: vi.fn(),
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.supabase }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { GET } from "@/app/auth/callback/route";
import { signInWithGoogle } from "@/app/auth/actions";

const callback = (search = "?code=one-time-code") => GET(new NextRequest(`http://localhost:3001/auth/callback${search}`));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3001");
  mocks.supabase.auth.exchangeCodeForSession.mockResolvedValue({
    data: { user: { id: "verified-user-id", email: "student@columbia.edu", user_metadata: { given_name: "Ada", family_name: "Lee" } } },
    error: null,
  });
  mocks.supabase.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://example.supabase.co/auth/v1/authorize" }, error: null });
  mocks.supabase.auth.signOut.mockResolvedValue({ error: null });
  mocks.supabase.from.mockReturnValue(mocks.query);
  mocks.query.update.mockReturnValue(mocks.query);
  mocks.query.eq.mockReturnValue(mocks.query);
  mocks.query.select.mockReturnValue(mocks.query);
  mocks.query.single.mockResolvedValue({ data: { id: "verified-user-id" }, error: null });
});

describe("admin Google sign-in", () => {
  it("always asks Google to show the account chooser", async () => {
    await expect(signInWithGoogle()).rejects.toThrow("redirect:https://example.supabase.co/auth/v1/authorize");
    expect(mocks.supabase.auth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        redirectTo: "http://localhost:3001/auth/callback",
        queryParams: { hd: "columbia.edu", prompt: "select_account" },
      }),
    }));
  });

  it("admits Columbia accounts", async () => {
    const response = await callback();
    expect(response.headers.get("location")).toBe("http://localhost:3001/");
    expect(mocks.supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it("signs out and rejects non-Columbia accounts", async () => {
    mocks.supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "outsider", email: "someone@gmail.com", user_metadata: {} } },
      error: null,
    });
    const response = await callback();
    expect(response.headers.get("location")).toBe("http://localhost:3001/login?error=domain");
    expect(mocks.supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.supabase.from).not.toHaveBeenCalled();
  });

  it("treats a cancelled Google sign-in as cancelled", async () => {
    const response = await callback("?error=access_denied");
    expect(response.headers.get("location")).toBe("http://localhost:3001/login?error=cancelled");
  });
});
