import { schoolLevels } from "@/lib/levels";

/** Class arms for a school, sorted Pre-Nursery → SS 3, limited to the levels the school runs. */
export async function loadArms(supabase: any, schoolId: string, school?: any) {
  const { data } = await supabase.from("class_arms")
    .select("id, arm, class_code, class_teacher_id, class_levels(name, sort_order, level)").eq("school_id", schoolId);
  const levels = school ? schoolLevels(school) : null;
  return (data || [])
    .filter((a: any) => !levels || levels.includes(a.class_levels?.level))
    .sort((a: any, b: any) => a.class_levels.sort_order - b.class_levels.sort_order || a.arm.localeCompare(b.arm))
    .map((a: any) => ({ ...a, label: `${a.class_levels.name} ${a.arm}`, level: a.class_levels.level }));
}
