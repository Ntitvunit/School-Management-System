import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";
import AutoSelect from "@/components/AutoSelect";

type Search = { arm?: string; term?: string };

export default async function CoveragePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, school } = await requireMember(["admin"]);
  const { data: armsRaw } = await supabase.from("class_arms")
    .select("id, arm, class_code, class_levels(name, sort_order)").eq("school_id", school.id);
  const arms = (armsRaw || []).sort((a: any, b: any) => a.class_levels.sort_order - b.class_levels.sort_order || a.arm.localeCompare(b.arm));
  const term = Number(sp.term) || school.current_term;
  const arm: any = arms.find((a: any) => a.id === sp.arm) || arms[0];
  if (!arm) return <main className="page"><div className="card">No classes set up yet.</div></main>;

  const [{ data: topics }, { data: offerings }, { data: cov }] = await Promise.all([
    supabase.from("curriculum_topics").select("id, subject_id, week_start, week_type")
      .eq("class_code", arm.class_code).eq("term", term).eq("week_type", "teaching"),
    supabase.from("curriculum_offerings").select("subject_id, subjects(name)").eq("class_code", arm.class_code),
    supabase.from("topic_coverage").select("topic_id").eq("class_arm_id", arm.id)
      .eq("session", school.current_session).eq("status", "covered"),
  ]);
  const covered = new Set((cov || []).map((c: any) => c.topic_id));
  const isCurrent = term === school.current_term;
  const rows = (offerings || []).map((o: any) => {
    const ts = (topics || []).filter((t: any) => t.subject_id === o.subject_id);
    const done = ts.filter((t: any) => covered.has(t.id)).length;
    const expected = isCurrent ? ts.filter((t: any) => t.week_start <= school.current_week).length : 0;
    return { id: o.subject_id, name: o.subjects?.name ?? o.subject_id, total: ts.length, done, expected };
  }).sort((a, b) => (b.expected - b.done) - (a.expected - a.done) || a.name.localeCompare(b.name));

  return (
    <main className="page">
      <form className="card row" method="get" action="/coverage">
        <label className="field" htmlFor="c-arm">Class
          <AutoSelect id="c-arm" name="arm" defaultValue={arm.id}>
            {arms.map((a: any) => <option key={a.id} value={a.id}>{a.class_levels.name} {a.arm}</option>)}
          </AutoSelect>
        </label>
        <label className="field" htmlFor="c-term">Term
          <AutoSelect id="c-term" name="term" defaultValue={String(term)}>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{TERM_NAMES[n]} term</option>)}
          </AutoSelect>
        </label>
        <noscript><button className="btn">Show</button></noscript>
        <div className="small muted" style={{ marginLeft: "auto" }}>Current: {TERM_NAMES[school.current_term]} term, week {school.current_week}</div>
      </form>
      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Curriculum coverage · {arm.class_levels.name} {arm.arm} · {TERM_NAMES[term]} term</h2>
          <span className="small muted">Bar: topics covered · gold line: expected by the current week</span>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => {
            const pct = r.total ? Math.round((100 * r.done) / r.total) : 0;
            const ep = r.total ? (100 * r.expected) / r.total : 0;
            const behind = r.expected - r.done;
            return (
              <div className="bar" key={r.id}>
                <div>
                  <Link href={`/scheme?arm=${arm.id}&subject=${r.id}&term=${term}`}><b>{r.name}</b></Link>
                  <div className="small muted">{r.done} of {r.total} topics{behind > 0 && <> · <span className="behind">{behind} behind</span></>}</div>
                </div>
                <div className="track" role="img" aria-label={`${pct}% covered`}>
                  <div className="fill" style={{ width: `${pct}%` }} />
                  {ep > 0 && <div className="expected" style={{ left: `calc(${ep}% - 1.5px)` }} />}
                </div>
                <div className="pct">{pct}%</div>
              </div>
            );
          })}
        </div>
        <p className="small muted">Counts teaching weeks only. Teachers update this with “Mark as covered” on the Scheme of work page.</p>
      </section>
    </main>
  );
}
