"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createSchool(_: any, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_school", {
    p_school_name: String(form.get("school_name") || ""),
    p_full_name: String(form.get("full_name") || ""),
  });
  if (error) return { error: error.message };
  redirect("/settings?welcome=1");
}

export async function joinSchool(_: any, form: FormData) {
  const supabase = await createClient();
  const role = String(form.get("role") || "teacher");
  const { error } = await supabase.rpc("join_school", {
    p_code: String(form.get("code") || ""),
    p_full_name: String(form.get("full_name") || ""),
    p_role: role,
  });
  if (error) return { error: error.message };
  redirect(role === "parent" ? "/this-week" : "/scheme");
}

export async function joinAsStudent(_: any, form: FormData) {
  const supabase = await createClient();
  const dob = String(form.get("dob") || "");
  const { error } = await supabase.rpc("join_as_student", {
    p_code: String(form.get("code") || ""),
    p_admission_no: String(form.get("admission_no") || ""),
    p_full_name: String(form.get("full_name") || ""),
    p_dob: dob || null,
  });
  if (error) return { error: error.message };
  redirect("/my");
}
