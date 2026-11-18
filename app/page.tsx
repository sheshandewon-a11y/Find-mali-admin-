
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();

  if (!user) redirect("/login");

  if (!adminEmail || user.email?.toLowerCase() !== adminEmail) {
    redirect("/unauthorized");
  }

  return <Dashboard email={user.email ?? "Administrator"} />;
}
