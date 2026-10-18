import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { loadArms } from "@/lib/arms";
import { activeClassSubjects } from "@/lib/subjects";
import { bands, parts } from "@/lib/grading";
import AutoSelect from "@/components/AutoSelect";
import ScoreSheet from "@/components/ScoreSheet";
import { saveScores } from "./actions";

type Search = { arm?: string; subject?: string; term?: string };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember(["admin", "teacher"]);
  const arms = await loadArms(supabase, school.id, school);
  const { data: mine } = await supabase.from("teacher_subjects").select("class_arm_id, subject_id, subjects(name)").eq("teacher_id", profile.id);
  const armLabel = new Map(arms.map((a: any) => [a.id, a.label]));

  const arm: any = arms.find((a: any) => a.id === sp.arm) || (mine?.[0] && arms.find((a: any) => a.id === mine[0].class_arm_id)) || arms[0];
  if (!arm) return <main className="page"><div className="card">No classes yet. Set the levels your school runs in Settings.</div></main>;
  const subjects = await activeClassSubjects(supabase, school.id, arm.class_code);
  const subject = subjects.find((s) => s.id === sp.subject) || subjects.find((s) => mine?.some((m: any) => m.subject_id === s.id && m.class_arm_id === arm.id)) || subjects[0];
  const term = Number(sp.term) || school.current_term;
  const session = school.current_session;

  const [{ data: students }, { data: scores }, { data: pub }] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name, admission_no").eq("class_arm_id", arm.id).eq("status", "active").order("last_name").order("first_name"),
    subject ? supabase.from("scores").select("student_id, parts").eq("class_arm_id", arm.id).eq("subject_id", subject.id).eq("session", session).eq("term", term) : Promise.resolve({ data: [] as any[] }),
    supabase.from("result_publications").select("published_at").match({ class_arm_id: arm.id, session, term }).maybeSingle(),
  ]);
  const initial: Record<string, any> = {};
  for (const s of scores || []) initial[s.student_id] = s.parts;
  const locked = !!pub && profile.role !== "admin";

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Results: score entry</h1>
          <p className="muted small">{session} · {TERM_NAMES[term]} term</p>
        </div>
        <div className="row">
          <Link className="btn ghost small" href={`/results/broadsheet?arm=${arm.id}&term=${term}`}>Class broadsheet</Link>
          <Link className="btn ghost small" href={`/results/remarks?arm=${arm.id}&term=${term}`}>Comments and ratings</Link>
          {profile.role === "admin" && <Link className="btn ghost small" href="/results/log">Score change log</Link>}
        </div>
      </div>
      {mine && mine.length > 0 && (
        <div className="row small">
          <span className="muted">My subjects:</span>
          {mine.map((m: any) => (
            <Link key={m.class_arm_id + m.subject_id} className="chip covered" style={{ textDecoration: "none" }}
              href={`/results?arm=${m.class_arm_id}&subject=${m.subject_id}&term=${term}`}>{armLabel.get(m.class_arm_id)} · {m.subjects?.name}</Link>
          ))}
        </div>
      )}
      <form className="card row" method="get" action="/results">
        <label className="field" htmlFor="r-arm">Class
          <AutoSelect id="r-arm" name="arm" defaultValue={arm.id}>{arms.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}</AutoSelect>
        </label>
        <label className="field" htmlFor="r-subject">Subject
          <AutoSelect id="r-subject" name="subject" defaultValue={subject?.id}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</AutoSelect>
        </label>
        <label className="field" htmlFor="r-term">Term
          <AutoSelect id="r-term" name="term" defaultValue={String(term)}>{[1, 2, 3].map((n) => <option key={n} value={n}>{TERM_NAMES[n]} term</option>)}</AutoSelect>
        </label>
        <noscript><button className="btn">Show</button></noscript>
      </form>
      {pub && <div className={locked ? "error" : "notice"}>Results for {arm.label} have been published{locked ? ", so they are locked. Ask the admin to unpublish if a correction is needed." : ". As admin you can still correct scores; every change is recorded in the score change log."}</div>}
      {!students?.length ? (
        <div className="card">No active students in {arm.label}. Add students and assign them to this class first.</div>
      ) : !subject ? (
        <div className="card">No subjects set for this class. Check Settings → Subjects per class.</div>
      ) : (
        <ScoreSheet
          key={`${arm.id}-${subject.id}-${term}`}
          action={saveScores}
          students={students.map((s: any) => ({ id: s.id, name: `${s.last_name}, ${s.first_name}`, admission_no: s.admission_no }))}
          parts={parts(school)} bands={bands(school)} initial={initial} readOnly={locked}
          hidden={{ arm_id: arm.id, subject_id: subject.id, term: String(term), session }}
        />
      )}
    </main>
  );
}
