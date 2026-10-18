"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import { parts as schoolParts } from "@/lib/grading";

export async function saveScores(_: any, form: FormData) {
  const { supabase, user, school } = await requireMember(["admin", "teacher"]);
  const arm = String(form.get("arm_id")), subject = String(form.get("subject_id"));
  const term = Number(form.get("term")), session = String(form.get("session"));
  const ps = schoolParts(school);
  const ids = String(form.get("student_ids") || "").split(",").filter(Boolean);
  const rows: any[] = [];
  for (const sid of ids) {
    const parts: Record<string, number> = {};
    let any = false;
    for (const p of ps) {
      const raw = String(form.get(`s_${sid}_${p.key}`) ?? "").trim();
      if (raw === "") continue;
      const v = Math.max(0, Math.min(Number(p.max), Number(raw)));
      if (isNaN(v)) continue;
      parts[p.key] = Math.round(v * 10) / 10;
      any = true;
    }
    if (!any) continue;
    const total = Math.round(Object.values(parts).reduce((a, b) => a + b, 0) * 10) / 10;
    rows.push({ school_id: school.id, session, term, student_id: sid, subject_id: subject, class_arm_id: arm, parts, total, entered_by: user.id, updated_at: new Date().toISOString() });
  }
  if (rows.length) {
    const { error } = await supabase.from("scores").upsert(rows, { onConflict: "student_id,session,term,subject_id" });
    if (error) return { error: error.message.includes("row-level security") ? "These results have been published, so only the admin can change them." : error.message };
  }
  revalidatePath("/results");
  return { saved: rows.length };
}

export async function setPublished(form: FormData) {
  const { supabase, user, school } = await requireMember(["admin"]);
  const arm = String(form.get("arm_id")), session = String(form.get("session")), term = Number(form.get("term"));
  if (form.get("publish") === "1") {
    await supabase.from("result_publications").upsert({ school_id: school.id, class_arm_id: arm, session, term, published_by: user.id });
  } else {
    await supabase.from("result_publications").delete().match({ class_arm_id: arm, session, term });
  }
  revalidatePath("/results/broadsheet");
  redirect(`/results/broadsheet?arm=${arm}&term=${term}&session=${encodeURIComponent(session)}`);
}

export async function saveRemarks(form: FormData) {
  const { supabase, profile, school } = await requireMember(["admin", "teacher"]);
  const student = String(form.get("student_id")), arm = String(form.get("arm_id"));
  const session = String(form.get("session")), term = Number(form.get("term"));
  const collect = (prefix: string) => {
    const o: Record<string, number> = {};
    for (const [k, v] of form.entries()) if (k.startsWith(prefix) && String(v)) o[k.slice(prefix.length)] = Number(v);
    return o;
  };
  const row: any = {
    school_id: school.id, student_id: student, session, term, class_arm_id: arm,
    affective: collect("aff_"), psychomotor: collect("psy_"),
    teacher_comment: String(form.get("teacher_comment") || "").trim() || null, updated_at: new Date().toISOString(),
  };
  if (profile.role === "admin") row.principal_comment = String(form.get("principal_comment") || "").trim() || null;
  const { error } = await supabase.from("term_reports").upsert(row, { onConflict: "student_id,session,term" });
  if (error) throw new Error(error.message);
  const next = String(form.get("next_student") || "");
  revalidatePath("/results/remarks");
  redirect(`/results/remarks?arm=${arm}&term=${term}&session=${encodeURIComponent(session)}${next ? `&student=${next}` : ""}&saved=1`);
}

export async function makePins(form: FormData) {
  const { supabase } = await requireMember(["admin"]);
  const n = Math.max(1, Math.min(500, Number(form.get("count")) || 0));
  const { error } = await supabase.rpc("generate_result_pins", { p_count: n });
  if (error) throw new Error(error.message);
  revalidatePath("/results/pins");
  redirect("/results/pins?made=" + n);
}
