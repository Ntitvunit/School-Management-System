"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";

export async function updateSchool(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const { error } = await supabase.from("schools").update({
    name: String(form.get("name") || school.name).trim(),
    current_session: String(form.get("session") || school.current_session).trim(),
    current_term: Number(form.get("term")) || school.current_term,
    current_week: Number(form.get("week")) || school.current_week,
  }).eq("id", school.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

export async function addArm(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const arm = String(form.get("arm") || "").trim().toUpperCase().slice(0, 12);
  if (!arm) redirect("/settings");
  const { error } = await supabase.from("class_arms").insert({ school_id: school.id, class_code: String(form.get("class_code")), arm });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}
