"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";

export async function changeRole(form: FormData) {
  const { supabase } = await requireMember(["admin"]);
  const { error } = await supabase.rpc("set_member_role", { p_user: String(form.get("user_id")), p_role: String(form.get("role")) });
  if (error) redirect(`/staff?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/staff");
  redirect("/staff?saved=1");
}

export async function removeMember(form: FormData) {
  const { supabase } = await requireMember(["admin"]);
  const { error } = await supabase.rpc("remove_member", { p_user: String(form.get("user_id")) });
  if (error) redirect(`/staff?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/staff");
  redirect("/staff?saved=removed");
}

export async function setClassTeacher(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const teacher = String(form.get("teacher_id") || "");
  await supabase.from("class_arms").update({ class_teacher_id: teacher || null })
    .eq("id", String(form.get("arm_id"))).eq("school_id", school.id);
  revalidatePath("/staff");
  redirect("/staff?saved=1#classes");
}

export async function assignSubject(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const { error } = await supabase.from("teacher_subjects").upsert({
    school_id: school.id, teacher_id: String(form.get("teacher_id")),
    class_arm_id: String(form.get("arm_id")), subject_id: String(form.get("subject_id")),
  });
  if (error) redirect(`/staff?error=${encodeURIComponent(error.message)}#subjects`);
  revalidatePath("/staff");
  redirect("/staff?saved=1#subjects");
}

export async function unassignSubject(form: FormData) {
  const { supabase } = await requireMember(["admin"]);
  await supabase.from("teacher_subjects").delete().match({
    teacher_id: String(form.get("teacher_id")), class_arm_id: String(form.get("arm_id")), subject_id: String(form.get("subject_id")),
  });
  revalidatePath("/staff");
  redirect("/staff#subjects");
}
