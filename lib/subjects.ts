/** Subjects a class takes in this school: the default list, minus subjects switched off, plus the school's own additions. */
export async function classSubjects(supabase: any, schoolId: string, classCode: string) {
  const [{ data: offerings }, { data: settings }] = await Promise.all([
    supabase.from("curriculum_offerings").select("subject_id, subjects(name)").eq("class_code", classCode),
    supabase.from("school_subject_settings").select("subject_id, enabled, local_name, subjects(name)")
      .eq("school_id", schoolId).eq("class_code", classCode),
  ]);
  const map = new Map<string, { id: string; name: string; default: boolean; enabled: boolean }>();
  for (const o of offerings || []) map.set(o.subject_id, { id: o.subject_id, name: o.subjects?.name ?? o.subject_id, default: true, enabled: true });
  for (const s of settings || []) {
    const cur = map.get(s.subject_id);
    const name = s.local_name || cur?.name || s.subjects?.name || s.subject_id;
    map.set(s.subject_id, { id: s.subject_id, name, default: !!cur, enabled: s.enabled });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export async function activeClassSubjects(supabase: any, schoolId: string, classCode: string) {
  return (await classSubjects(supabase, schoolId, classCode)).filter((s) => s.enabled);
}
