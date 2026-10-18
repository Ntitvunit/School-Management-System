import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { SCIENCE_SUBJECTS, WEEK_LABEL, type Topic } from "@/lib/curriculum";
import AutoSelect from "@/components/AutoSelect";
import { startLessonNote, toggleCoverage } from "./actions";

type Search = { arm?: string; subject?: string; term?: string; week?: string };

export default async function SchemePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember(["admin", "teacher"]);

  const { data: armsRaw } = await supabase
    .from("class_arms")
    .select("id, arm, class_code, class_levels(name, sort_order)")
    .eq("school_id", school.id);
  const arms = (armsRaw || []).sort((a: any, b: any) => a.class_levels.sort_order - b.class_levels.sort_order || a.arm.localeCompare(b.arm));
  if (!arms.length) return <main className="page"><div className="card">No classes set up yet. Ask your admin.</div></main>;

  const arm: any = arms.find((a: any) => a.id === sp.arm) || arms.find((a: any) => a.class_code === "P4") || arms[0];
  const { data: offerings } = await supabase
    .from("curriculum_offerings")
    .select("subject_id, subjects(name)")
    .eq("class_code", arm.class_code);
  const subjects = (offerings || []).map((o: any) => ({ id: o.subject_id, name: o.subjects?.name ?? o.subject_id }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const subject = subjects.find((s) => s.id === sp.subject) || subjects[0];
  const term = Number(sp.term) || school.current_term;

  const { data: topicsRaw } = subject
    ? await supabase.from("curriculum_topics").select("*")
        .eq("class_code", arm.class_code).eq("subject_id", subject.id).eq("term", term).order("week_start")
    : { data: [] as any[] };
  const topics = (topicsRaw || []) as Topic[];

  const { data: cov } = await supabase.from("topic_coverage").select("topic_id")
    .eq("class_arm_id", arm.id).eq("session", school.current_session).eq("status", "covered");
  const covered = new Set((cov || []).map((c: any) => c.topic_id));

  const isCurrentTerm = term === school.current_term;
  const sel = topics.find((t) => t.id === sp.week)
    || (isCurrentTerm && topics.find((t) => t.week_start === school.current_week))
    || topics[0];

  const { data: myNote } = sel
    ? await supabase.from("lesson_notes").select("id, status")
        .match({ topic_id: sel.id, class_arm_id: arm.id, session: school.current_session, teacher_id: profile.id }).maybeSingle()
    : { data: null };

  const teaching = topics.filter((t) => t.week_type === "teaching");
  const link = (t: Topic) => `/scheme?arm=${arm.id}&subject=${subject.id}&term=${term}&week=${t.id}`;
  const className = `${arm.class_levels.name} ${arm.arm}`;

  return (
    <main className="page">
      <form className="card row" method="get" action="/scheme">
        <label className="field" htmlFor="f-arm">Class
          <AutoSelect id="f-arm" name="arm" defaultValue={arm.id}>
            {arms.map((a: any) => <option key={a.id} value={a.id}>{a.class_levels.name} {a.arm}</option>)}
          </AutoSelect>
        </label>
        <label className="field" htmlFor="f-subject">Subject
          <AutoSelect id="f-subject" name="subject" defaultValue={subject?.id}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </AutoSelect>
        </label>
        <label className="field" htmlFor="f-term">Term
          <AutoSelect id="f-term" name="term" defaultValue={String(term)}>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{TERM_NAMES[n]} term</option>)}
          </AutoSelect>
        </label>
        <noscript><button className="btn">Show</button></noscript>
        <div className="small muted" style={{ marginLeft: "auto" }}>
          {school.current_session} · {TERM_NAMES[school.current_term]} term · <b>Week {school.current_week}</b>
        </div>
      </form>

      {!topics.length ? (
        <div className="card">No scheme of work found for this class, subject and term.</div>
      ) : (
        <section className="split">
          <nav aria-label="Weeks">
            <div className="row" style={{ justifyContent: "space-between", padding: "0 4px 8px" }}>
              <h2>{subject.name}</h2>
              <span className="small muted">{teaching.filter((t) => covered.has(t.id)).length} of {teaching.length} covered</span>
            </div>
            <ul className="weeks">
              {topics.map((t) => {
                const now = isCurrentTerm && t.week_start === school.current_week;
                let chip = WEEK_LABEL[t.week_type] ? <span className={`chip ${t.week_type}`}>{WEEK_LABEL[t.week_type]}</span> : null;
                if (t.week_type === "teaching" && covered.has(t.id)) chip = <span className="chip covered">Covered</span>;
                if (now) chip = <span className="chip now">This week</span>;
                return (
                  <li key={t.id}>
                    <Link href={link(t)} className={t.id === sel?.id ? "sel" : ""} aria-current={t.id === sel?.id ? "true" : undefined}>
                      <span className={`wk ${now ? "now" : ""}`}>Wk {t.week}</span>
                      <span>{t.topic || "—"}</span>
                      {chip}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {sel && (
            <article className="card" style={{ gap: 16 }}>
              <div>
                <div className="eyebrow">{className} · {subject.name} · {TERM_NAMES[term]} term · Week {sel.week}</div>
                <h3>{sel.topic || "—"}</h3>
              </div>

              {sel.week_type === "teaching" && (
                <div className="row">
                  <form action={toggleCoverage}>
                    <input type="hidden" name="topic_id" value={sel.id} />
                    <input type="hidden" name="arm_id" value={arm.id} />
                    <input type="hidden" name="covered" value={covered.has(sel.id) ? "1" : "0"} />
                    <button className={`btn ${covered.has(sel.id) ? "done" : ""}`}>
                      {covered.has(sel.id) ? "Covered ✓ (undo)" : "Mark as covered"}
                    </button>
                  </form>
                  {myNote ? (
                    <Link className="btn ghost" href={`/notes/${myNote.id}`}>Open my lesson note ({myNote.status})</Link>
                  ) : (
                    <form action={startLessonNote}>
                      <input type="hidden" name="topic_id" value={sel.id} />
                      <input type="hidden" name="arm_id" value={arm.id} />
                      <button className="btn ghost">Start lesson note</button>
                    </form>
                  )}
                </div>
              )}

              <div className="cols">
                <Block title="Content / sub-topics" items={sel.subtopics} show={!!sel.subtopics?.length || !sel.teacher_activities?.length} />
                <Block title="Objectives" items={sel.objectives} />
                <Block title="Teacher's activities" items={sel.teacher_activities} />
                <Block title="Pupils' activities" items={sel.pupil_activities} />
                <Block title="Learning resources" items={sel.resources} />
              </div>

              {SCIENCE_SUBJECTS.has(sel.subject_id) && sel.week_type === "teaching" && (
                <div className="labs">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div className="block"><h4 style={{ margin: 0 }}>Virtual labs and simulations</h4></div>
                    <span className="small muted">Embedding: awaiting permission · links open in a new tab</span>
                  </div>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span>Find a LabXchange simulation for “{sel.topic}”</span>
                    <a href="https://www.labxchange.org" target="_blank" rel="noopener noreferrer"><b>Open LabXchange</b></a>
                  </div>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span>Or a PhET simulation</span>
                    <a href="https://phet.colorado.edu" target="_blank" rel="noopener noreferrer"><b>Open PhET</b></a>
                  </div>
                </div>
              )}
              <div className="small muted">Source: scheme of work, page {sel.source_page}</div>
            </article>
          )}
        </section>
      )}
    </main>
  );
}

function Block({ title, items, show }: { title: string; items?: string[]; show?: boolean }) {
  if (!(show ?? (items && items.length))) return null;
  return (
    <div className="block">
      <h4>{title}</h4>
      {items && items.length ? <ul>{items.map((i, k) => <li key={k}>{i}</li>)}</ul> : <p className="muted"><i>Not specified in the scheme</i></p>}
    </div>
  );
}
