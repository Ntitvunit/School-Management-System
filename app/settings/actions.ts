"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import { THEMES, isHex } from "@/lib/theme";
import { LEVELS } from "@/lib/levels";

const str = (form: FormData, k: string) => String(form.get(k) ?? "").trim();

export async function updateSchool(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const { error } = await supabase.from("schools").update({
    name: str(form, "name") || school.name,
    motto: str(form, "motto") || null,
    address: str(form, "address") || null,
    phone: str(form, "phone") || null,
    current_session: str(form, "session") || school.current_session,
    current_term: Number(form.get("term")) || school.current_term,
    current_week: Number(form.get("week")) || school.current_week,
    next_term_begins: str(form, "next_term_begins") || null,
  }).eq("id", school.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

export async function updateLevels(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const levels = LEVELS.map((l) => l.id).filter((id) => form.get(`level_${id}`) === "on");
  const { error } = await supabase.from("schools").update({ levels: levels.length ? levels : ["primary"] }).eq("id", school.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/settings?saved=levels#levels");
}

export async function updateTheme(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const theme = str(form, "theme") || "chalkboard";
  const valid = theme === "custom" || THEMES.some((t) => t.id === theme);
  const primary = str(form, "brand_primary"), accent = str(form, "brand_accent");
  const { error } = await supabase.from("schools").update({
    theme: valid ? theme : "chalkboard",
    brand_primary: isHex(primary) ? primary : null,
    brand_accent: isHex(accent) ? accent : null,
  }).eq("id", school.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/settings?saved=theme#theme");
}

export async function updateAssessment(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const parts: { key: string; label: string; max: number }[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const label = str(form, `p_label_${i}`);
    const max = Number(form.get(`p_max_${i}`));
    if (!label || !(max > 0)) continue;
    // keep the existing key so scores already entered stay attached to the right column
    let key = str(form, `p_key_${i}`) || `c${i + 1}`;
    while (used.has(key)) key = key + "x";
    used.add(key);
    parts.push({ key, label, max });
  }
  const bands = str(form, "grading").split("\n").map((line) => {
    const m = line.trim().match(/^(\d+(?:\.\d+)?)\s+(\S+)\s*(.*)$/);
    return m ? { min: Number(m[1]), grade: m[2], remark: m[3].trim() } : null;
  }).filter(Boolean);
  if (!parts.length) redirect("/settings?error=parts#assessment");
  if (!bands.length) redirect("/settings?error=grading#assessment");
  const { error } = await supabase.from("schools").update({
    assessment: parts, grading: bands, block_results_if_owing: form.get("block") === "on",
  }).eq("id", school.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  redirect("/settings?saved=assessment#assessment");
}

export async function addArm(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const arm = str(form, "arm").toUpperCase().slice(0, 12);
  if (!arm) redirect("/settings#arms");
  const { error } = await supabase.from("class_arms").insert({ school_id: school.id, class_code: str(form, "class_code"), arm });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  revalidatePath("/settings");
  redirect("/settings?saved=1#arms");
}

export async function toggleSubject(form: FormData) {
  const { supabase, school } = await requireMember(["admin"]);
  const classCode = str(form, "class_code");
  await supabase.from("school_subject_settings").upsert({
    school_id: school.id, class_code: classCode, subject_id: str(form, "subject_id"), enabled: form.get("enabled") === "1",
  });
  revalidatePath("/settings/subjects");
  redirect(`/settings/subjects?class=${classCode}`);
}

export async function addSubject(form: FormData) {
  const { supabase } = await requireMember(["admin"]);
  const classCode = str(form, "class_code");
  const { error } = await supabase.rpc("add_custom_subject", { p_name: str(form, "name"), p_class_code: classCode });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/subjects");
  redirect(`/settings/subjects?class=${classCode}&added=1`);
}
