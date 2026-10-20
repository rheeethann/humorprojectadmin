"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// The database functions verify admin access; these actions only validate input.
export async function setUserRole(userId: string, role: "user" | "superadmin"): Promise<ActionResult> {
  if (!isUuid(userId) || (role !== "user" && role !== "superadmin")) return { error: "That user could not be found." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { target_user_id: userId, new_role: role });
  if (error) return { error: error.message.includes("own superadmin") ? "You can’t remove your own superadmin role." : "The role could not be changed." };
  revalidatePath("/");
  return { success: role === "superadmin" ? "Promoted to superadmin." : "Changed to standard user." };
}

export async function deleteContent(mediaId: string): Promise<ActionResult> {
  if (!isUuid(mediaId)) return { error: "That post could not be found." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_media", { target_media_id: mediaId });
  if (error) return { error: "The post could not be deleted." };
  revalidatePath("/");
  return { success: "Post deleted." };
}
