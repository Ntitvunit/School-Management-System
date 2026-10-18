import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Signed-in user, profile, school and platform-owner flag. Cached per request. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, school: null, isPlatformAdmin: false };
  const [{ data: profile }, { data: isPlatformAdmin }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.rpc("is_platform_admin"),
  ]);
  let school: any = null;
  if (profile?.school_id) {
    const { data } = await supabase.from("schools").select("*").eq("id", profile.school_id).maybeSingle();
    school = data;
  }
  return { supabase, user, profile: profile as any, school, isPlatformAdmin: !!isPlatformAdmin };
});
