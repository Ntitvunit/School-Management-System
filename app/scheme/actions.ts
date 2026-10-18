"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import { lessonNoteTemplate, type Topic } from "@/lib/curriculum";

export async function toggleCoverage(form: FormData) {
  const { supabase, user, school } = await requireMember(["admin", "teacher"]);
  const topicId = String(form.get("topic_id"));
  const armId = String(form.get("arm_id"));
  const covered = form.get("covered") === "1";
  if (covered) {
    await supabase.from("topic_coverage").delete()
      .match({ school_id: school.id, session: school.current_session, class_arm_id: armId, topic_id: topicId });
  } else {
    await supabase.from("topic_coverage").upsert({
      school_id: school.id, session: school.current_session, class_arm_id: armId, topic_id: topicId,
      teacher_id: user.id, status: "covered", covered_on: new Date().toISOString().slice(0, 10),
    });
  }
  revalidatePath("/scheme");
  revalidatePath("/coverage");
}

export async function startLessonNote(form: FormData) {
  const { supabase, user, profile, school } = await requireMember(["admin", "teacher"]);
  const topicId = String(form.get("topic_id"));
  const armId = String(form.get("arm_id"));
  const { data: existing } = await supabase.from("lesson_notes").select("id")
    .match({ teacher_id: user.id, topic_id: topicId, class_arm_id: armId, session: school.current_session }).maybeSingle();
  if (existing) redirect(`/notes/${existing.id}`);
  const { data: t } = await supabase.from("curriculum_topics").select("*").eq("id", topicId).single();
  const { data: cls } = await supabase.from("class_levels").select("name").eq("code", t.class_code).single();
  const { data: subj } = await supabase.from("subjects").select("name").eq("id", t.subject_id).single();
  const { data: arm } = await supabase.from("class_arms").select("arm").eq("id", armId).single();
  const text = lessonNoteTemplate(t as Topic, {
    school: school.name, session: school.current_session, className: `${cls?.name} ${arm?.arm ?? ""}`.trim(),
    subject: subj?.name ?? "", teacher: profile.full_name ?? "",
  });
  const { data: note, error } = await supabase.from("lesson_notes").insert({
    school_id: school.id, session: school.current_session, class_arm_id: armId, topic_id: topicId,
    teacher_id: user.id, content: { text }, status: "draft",
  }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/notes/${note.id}`);
}
