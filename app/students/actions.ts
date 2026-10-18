"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";

function fields(form: FormData) {
  const v = (k: string) => {
    const s = String(form.get(k) ?? "").trim();
    return s === "" ? null : s;
  };
  return {
    admission_no: v("admission_no"),
    first_name: v("first_name"),
    last_name: v("last_name"),
    other_names: v("other_names"),
    gender: v("gender"),
    date_of_birth: v("date_of_birth"),
    class_arm_id: v("class_arm_id"),
    guardian_name: v("guardian_name"),
    guardian_phone: v("guardian_phone"),
    guardian_email: v("guardian_email"),
    address: v("address"),
    medical_notes: v("medical_notes"),
    status: v("status") || "active",
  };
}

function friendly(msg: string) {
  if (msg.includes("students_school_id_admission_no_key") || msg.includes("duplicate")) return "Another student already has that admission number.";
  return msg;
}

export async function createStudent(_: any, form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const f = fields(form);
  if (!f.admission_no || !f.first_name || !f.last_name) return { error: "Admission number, first name and last name are required." };
  const { data, error } = await supabase.from("students").insert({ ...f, school_id: school.id }).select("id").single();
  if (error) return { error: friendly(error.message) };
  revalidatePath("/students");
  redirect(`/students/${data.id}?saved=new`);
}

export async function updateStudent(_: any, form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const id = String(form.get("id"));
  const f = fields(form);
  if (!f.admission_no || !f.first_name || !f.last_name) return { error: "Admission number, first name and last name are required." };
  const { error } = await supabase.from("students").update({ ...f, updated_at: new Date().toISOString() })
    .eq("id", id).eq("school_id", school.id);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/students");
  redirect(`/students/${id}?saved=1`);
}

export async function linkParent(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const student_id = String(form.get("student_id"));
  const parent_id = String(form.get("parent_id") || "");
  if (parent_id) {
    await supabase.from("student_guardians").upsert({
      school_id: school.id, student_id, parent_id, relationship: String(form.get("relationship") || "") || null,
    });
  }
  revalidatePath(`/students/${student_id}`);
  redirect(`/students/${student_id}?saved=link`);
}

export async function unlinkParent(form: FormData) {
  const { supabase } = await requireMember(["admin"]);
  const student_id = String(form.get("student_id"));
  await supabase.from("student_guardians").delete().match({ student_id, parent_id: String(form.get("parent_id")) });
  revalidatePath(`/students/${student_id}`);
  redirect(`/students/${student_id}`);
}
