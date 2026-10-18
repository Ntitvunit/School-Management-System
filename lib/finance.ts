/** Billed, discount, paid and balance for every active student this term (staff with finance access). */
export async function termLedger(supabase: any, school: any, arms: any[]) {
  const session = school.current_session, term = school.current_term;
  const [{ data: students }, { data: items }, { data: adj }, { data: pays }] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name, admission_no, class_arm_id, guardian_phone").eq("school_id", school.id).eq("status", "active"),
    supabase.from("fee_items").select("class_code, amount").eq("school_id", school.id).eq("session", session).eq("term", term),
    supabase.from("fee_adjustments").select("student_id, amount").eq("school_id", school.id).eq("session", session).eq("term", term),
    supabase.from("payments").select("student_id, amount").eq("school_id", school.id).eq("session", session).eq("term", term),
  ]);
  const armMap = new Map(arms.map((a: any) => [a.id, a]));
  const sum = (rows: any[], id: string) => rows.filter((r) => r.student_id === id).reduce((a, r) => a + Number(r.amount), 0);
  return (students || []).map((s: any) => {
    const arm: any = armMap.get(s.class_arm_id);
    const billed = (items || []).filter((i: any) => !i.class_code || i.class_code === arm?.class_code).reduce((a: number, i: any) => a + Number(i.amount), 0);
    const discount = sum(adj || [], s.id), paid = sum(pays || [], s.id);
    return { ...s, classLabel: arm?.label || "—", armId: s.class_arm_id, billed, discount, paid, balance: billed - discount - paid };
  });
}
