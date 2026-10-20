import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AdminContent, AdminUser } from "@/lib/admin-table";

const bucket = "generated-media";

type UserRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "user" | "superadmin";
  last_sign_in_at: string | null;
  post_count: number | string;
  vote_count: number | string;
  streak_days: number;
  average_distance: number | string | null;
};

type MediaRow = {
  id: string;
  prompt: string;
  image_path: string;
  caption: string;
  created_at: string;
  author_first_name: string | null;
  author_last_name: string | null;
  author_email: string | null;
  vote_count: number | string;
  average_rating: number | string | null;
  deleted_at: string | null;
};

function fullName(first: string | null, last: string | null, email: string | null): string {
  return [first, last].filter(Boolean).join(" ") || email?.split("@")[0] || "Unknown";
}

function toNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

export async function getAdminData(): Promise<{ users: AdminUser[]; content: AdminContent[] }> {
  const supabase = await createClient();
  const [usersResult, mediaResult] = await Promise.all([supabase.rpc("admin_users"), supabase.rpc("admin_media")]);
  if (usersResult.error || mediaResult.error) throw new Error("Admin data is unavailable right now.");

  const userRows = (usersResult.data ?? []) as UserRow[];
  const mediaRows = (mediaResult.data ?? []) as MediaRow[];

  const urls = new Map<string, string>();
  if (mediaRows.length > 0) {
    const { data: signed } = await supabase.storage
      .from(bucket)
      .createSignedUrls(mediaRows.map((row) => row.image_path), 60 * 60);
    (signed ?? []).forEach((item) => {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    });
  }

  return {
    users: userRows.map((row) => ({
      id: row.id,
      email: row.email,
      name: fullName(row.first_name, row.last_name, row.email),
      role: row.role,
      lastSignInAt: row.last_sign_in_at,
      postCount: Number(row.post_count),
      voteCount: Number(row.vote_count),
      streakDays: row.streak_days,
      averageDistance: toNumber(row.average_distance),
    })),
    content: mediaRows.map((row) => ({
      id: row.id,
      imageUrl: urls.get(row.image_path) ?? null,
      caption: row.caption,
      prompt: row.prompt,
      createdAt: row.created_at,
      authorName: fullName(row.author_first_name, row.author_last_name, row.author_email),
      authorEmail: row.author_email ?? "",
      voteCount: Number(row.vote_count),
      averageRating: toNumber(row.average_rating),
      deletedAt: row.deleted_at,
    })),
  };
}
