import { redirect } from "next/navigation";
import { getAdminData } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import AdminDashboard from "./admin-dashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login");

  const { data: allowed, error: accessError } = await supabase.rpc("can_access_admin");
  if (accessError || allowed !== true) redirect("/login?error=domain");

  const { users, content } = await getAdminData();
  const viewer = users.find((user) => user.id === data.claims.sub);
  return <AdminDashboard users={users} content={content} viewerId={data.claims.sub} viewerName={viewer?.name ?? ""} appUrl={process.env.NEXT_PUBLIC_APP_URL} />;
}
