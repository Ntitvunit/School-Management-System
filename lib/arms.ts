/** Class arms for a school, sorted Pre-Nursery → Primary 6, with display labels. */
export async function loadArms(supabase: any, schoolId: string) {
  const { data } = await supabase.from("class_arms")
    .select("id, arm, class_code, class_levels(name, sort_order)").eq("school_id", schoolId);
  return (data || [])
    .sort((a: any, b: any) => a.class_levels.sort_order - b.class_levels.sort_order || a.arm.localeCompare(b.arm))
    .map((a: any) => ({ ...a, label: `${a.class_levels.name} ${a.arm}` }));
}
