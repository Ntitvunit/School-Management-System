"use server";
import { createClient } from "@/lib/supabase/server";

export async function checkResult(_: any, form: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_result_by_pin", {
    p_pin: String(form.get("pin") || ""), p_admission_no: String(form.get("admission_no") || ""),
  });
  if (error) return { error: error.message };
  return { data };
}
