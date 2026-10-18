import { requireMember, TERM_NAMES } from "@/lib/session";
import AutoSelect from "@/components/AutoSelect";

export default async function ThisWeek({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const sp = await searchParams;
  const { supabase, school } = await requireMember();
  const { data: classes } = await supabase.from("class_levels").select("code, name, sort_order").order("sort_order");
  const cls = (classes || []).find((c: any) => c.code === sp.class) || (classes || []).find((c: any) => c.code === "P4") || classes?.[0];
  const { data: topics } = await supabase.from("curriculum_topics")
    .select("id, topic, subtopics, week_type, subjects(name)")
    .eq("class_code", cls.code).eq("term", school.current_term).eq("week_start", school.current_week);
  const list = (topics || []).sort((a: any, b: any) => (a.subjects?.name || "").localeCompare(b.subjects?.name || ""));
  return (
    <main className="page" style={{ maxWidth: 900 }}>
      <div>
        <h1>What your child is learning this week</h1>
        <p className="muted">{school.current_session} · {TERM_NAMES[school.current_term]} term · Week {school.current_week}</p>
      </div>
      <form className="card row" method="get" action="/this-week">
        <label className="field" htmlFor="tw-class">Class
          <AutoSelect id="tw-class" name="class" defaultValue={cls.code}>
            {(classes || []).map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </AutoSelect>
        </label>
        <noscript><button className="btn">Show</button></noscript>
      </form>
      <section className="card">
        {!list.length && <p className="muted">Nothing scheduled for this week.</p>}
        {list.map((t: any) => (
          <div key={t.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div className="eyebrow">{t.subjects?.name}</div>
            <h2>{t.topic}</h2>
            {t.week_type === "teaching" && t.subtopics?.length > 0 && (
              <ul className="small muted" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {t.subtopics.slice(0, 4).map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
