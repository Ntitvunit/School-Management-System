"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";

export async function saveNote(form: FormData) {
  const { supabase, user } = await requireMember(["admin", "teacher"]);
  const id = String(form.get("id"));
  const intent = String(form.get("intent"));
  const text = String(form.get("text") || "");
  const update: any = { content: { text }, updated_at: new Date().toISOString() };
  if (intent === "submit") { update.status = "submitted"; update.submitted_at = new Date().toISOString(); }
  const { error } = await supabase.from("lesson_notes").update(update).eq("id", id).eq("teacher_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/notes/${id}`);
  redirect(`/notes/${id}?saved=${intent}`);
}

export async function reviewNote(form: FormData) {
  const { supabase, user } = await requireMember(["admin"]);
  const id = String(form.get("id"));
  const decision = String(form.get("decision")) === "approve" ? "approved" : "returned";
  const { error } = await supabase.from("lesson_notes").update({
    status: decision, reviewer_id: user.id, review_comment: String(form.get("comment") || ""),
    approved_at: decision === "approved" ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/notes");
  redirect(`/notes/${id}?saved=${decision}`);
}

export async function deleteNote(form: FormData) {
  const { supabase, user } = await requireMember(["admin", "teacher"]);
  await supabase.from("lesson_notes").delete().eq("id", String(form.get("id"))).eq("teacher_id", user.id).eq("status", "draft");
  redirect("/notes");
}
