import { redirect } from "next/navigation";
import { getContext } from "@/lib/context";

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
  theme: string;
  brand_primary: string | null;
  brand_accent: string | null;
  motto: string | null;
  status: "active" | "suspended";
};

/** Signed-in user with an active school. Sends people to login, onboarding or the suspended notice when needed. */
export async function requireMember(allowed?: Profile["role"][]) {
  const { supabase, user, profile, school, isPlatformAdmin } = await getContext();
  if (!user) redirect("/login");
  if (!profile || !profile.school_id) redirect("/onboarding");
  if (school?.status === "suspended") redirect("/suspended");
  if (allowed && !allowed.includes(profile.role)) redirect("/");
  return { supabase, user, profile: profile as Profile, school: school as School, isPlatformAdmin };
}

export const TERM_NAMES = ["", "First", "Second", "Third"];
