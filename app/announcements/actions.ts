"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";

export async function postAnnouncement(form: FormData) {
  const { supabase, user, school } = await requireMember(["admin"]);
  const title = String(form.get("title") || "").trim();
  if (!title) redirect("/announcements");
  await supabase.from("announcements").insert({
    school_id: school.id, title, body: String(form.get("body") || "").trim() || null,
    audience: String(form.get("audience") || "everyone"), created_by: user.id,
  });
  revalidatePath("/", "layout");
  redirect("/announcements?posted=1");
}

export async function deleteAnnouncement(form: FormData) {
  const { supabase } = await requireMember(["admin"]);
  await supabase.from("announcements").delete().eq("id", String(form.get("id")));
  revalidatePath("/", "layout");
  redirect("/announcements");
}
