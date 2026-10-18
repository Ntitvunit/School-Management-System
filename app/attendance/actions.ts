"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";

export async function saveAttendance(form: FormData) {
  const { supabase, user, school } = await requireMember(["admin", "teacher"]);
  const arm = String(form.get("arm_id")), day = String(form.get("day"));
  const ids = String(form.get("student_ids") || "").split(",").filter(Boolean);
  const rows = ids.map((sid) => ({
    school_id: school.id, class_arm_id: arm, student_id: sid, day,
    session: school.current_session, term: school.current_term,
    status: ["present", "absent", "late"].includes(String(form.get(`a_${sid}`))) ? String(form.get(`a_${sid}`)) : "present",
    marked_by: user.id,
  }));
  if (rows.length) {
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,day" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/attendance");
  redirect(`/attendance?arm=${arm}&day=${day}&saved=1`);
}
