import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  school_id: string | null;
  full_name: string | null;
  role: "admin" | "teacher" | "parent";
};

export type School = {
  id: string;
  name: string;
  join_code: string;
  current_session: string;
  current_term: number;
  current_week: number;
};

/** Signed-in user with a school. Sends people to login or onboarding when needed. */
export async function requireMember(allowed?: Profile["role"][]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile || !profile.school_id) redirect("/onboarding");
  if (allowed && !allowed.includes(profile.role)) redirect("/");
  const { data: school } = await supabase.from("schools").select("*").eq("id", profile.school_id).single();
  return { supabase, user, profile: profile as Profile, school: school as School };
}

export const TERM_NAMES = ["", "First", "Second", "Third"];
