import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";

export default async function My() {
  const { supabase, profile } = await requireMember(["student"]);
  const { data } = await supabase.from("students").select("id").eq("user_id", profile.id).maybeSingle();
  if (!data) return <main className="page"><div className="card">Your account is not linked to a student record. Please contact the school.</div></main>;
  redirect(`/children/${data.id}`);
}
