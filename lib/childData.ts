/** Data for the parent/student child page. */
export async function loadChild(supabase: any, school: any, studentId: string) {
  const { data, error } = await supabase.rpc("get_child_overview", { p_student: studentId });
  if (error || !data) return { error: error?.message || "Not found" };
  const { data: st } = await supabase.from("students").select("class_arm_id, class_arms(class_code)").eq("id", studentId).maybeSingle();
  const classCode = st?.class_arms?.class_code;
  const [{ data: thisWeek }, { data: announcements }] = await Promise.all([
    classCode
      ? supabase.from("curriculum_topics").select("id, topic, subjects(name)").eq("class_code", classCode)
          .eq("term", school.current_term).eq("week_start", school.current_week).eq("week_type", "teaching")
      : Promise.resolve({ data: [] as any[] }),
    supabase.from("announcements").select("id, title, body, created_at").eq("school_id", school.id).order("created_at", { ascending: false }).limit(3),
  ]);
  return { data, thisWeek: thisWeek || [], announcements: announcements || [] };
}
