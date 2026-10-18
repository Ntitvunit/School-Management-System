"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/context";

export async function setSchoolStatus(form: FormData) {
  const { supabase, isPlatformAdmin } = await getContext();
  if (!isPlatformAdmin) redirect("/");
  const status = String(form.get("status")) === "suspended" ? "suspended" : "active";
  const { error } = await supabase.rpc("platform_set_school_status", { p_school: String(form.get("school_id")), p_status: status });
  if (error) throw new Error(error.message);
  revalidatePath("/platform");
  redirect("/platform");
}
