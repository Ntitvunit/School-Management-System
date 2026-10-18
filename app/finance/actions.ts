"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";

export async function addFeeItem(form: FormData) {
  const { supabase, school } = await requireMember(["admin", "bursar"]);
  const amount = Number(String(form.get("amount") || "").replace(/[,₦\s]/g, ""));
  const name = String(form.get("name") || "").trim();
  if (!name || !(amount >= 0)) redirect("/finance/fees?error=1");
  const { error } = await supabase.from("fee_items").insert({
    school_id: school.id, session: school.current_session, term: Number(form.get("term")) || school.current_term,
    class_code: String(form.get("class_code") || "") || null, name, amount,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/finance");
  redirect(`/finance/fees?term=${Number(form.get("term")) || school.current_term}&saved=1`);
}

export async function deleteFeeItem(form: FormData) {
  const { supabase } = await requireMember(["admin", "bursar"]);
  await supabase.from("fee_items").delete().eq("id", String(form.get("id")));
  revalidatePath("/finance");
  redirect(`/finance/fees?term=${String(form.get("term") || "")}`);
}

export async function copyFees(form: FormData) {
  const { supabase, school } = await requireMember(["admin", "bursar"]);
  const from = Number(form.get("from_term")), to = Number(form.get("to_term"));
  const { data: items } = await supabase.from("fee_items").select("class_code, name, amount")
    .eq("school_id", school.id).eq("session", school.current_session).eq("term", from);
  if (items?.length) {
    await supabase.from("fee_items").insert(items.map((i: any) => ({ ...i, school_id: school.id, session: school.current_session, term: to })));
  }
  revalidatePath("/finance");
  redirect(`/finance/fees?term=${to}&saved=1`);
}

export async function recordPayment(_: any, form: FormData) {
  const { supabase, user, school } = await requireMember(["admin", "bursar"]);
  const amount = Number(String(form.get("amount") || "").replace(/[,₦\s]/g, ""));
  const student = String(form.get("student_id") || "");
  if (!student) return { error: "Choose a student." };
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };
  const { data, error } = await supabase.from("payments").insert({
    school_id: school.id, student_id: student, session: school.current_session,
    term: Number(form.get("term")) || school.current_term, amount,
    method: String(form.get("method") || "cash"), reference: String(form.get("reference") || "").trim() || null,
    paid_on: String(form.get("paid_on") || "") || undefined, note: String(form.get("note") || "").trim() || null, received_by: user.id,
  }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/finance");
  redirect(`/finance/receipt/${data.id}?new=1`);
}

export async function addDiscount(form: FormData) {
  const { supabase, school } = await requireMember(["admin", "bursar"]);
  const amount = Number(String(form.get("amount") || "").replace(/[,₦\s]/g, ""));
  const student = String(form.get("student_id") || "");
  if (student && amount > 0) {
    await supabase.from("fee_adjustments").insert({
      school_id: school.id, student_id: student, session: school.current_session, term: school.current_term,
      amount, reason: String(form.get("reason") || "").trim() || null,
    });
  }
  revalidatePath("/finance");
  redirect(`/students/${student}?saved=discount`);
}
