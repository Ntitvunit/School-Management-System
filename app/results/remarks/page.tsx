import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { loadArms } from "@/lib/arms";
import { AFFECTIVE, PSYCHOMOTOR, RATING_TEXT } from "@/lib/grading";
import AutoSelect from "@/components/AutoSelect";
import { saveRemarks } from "../actions";

type Search = { arm?: string; term?: string; session?: string; student?: string; saved?: string };

export default async function Remarks({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember(["admin", "teacher"]);
  const arms = await loadArms(supabase, school.id, school);
  const arm: any = arms.find((a: any) => a.id === sp.arm) || arms.find((a: any) => a.class_teacher_id === profile.id) || arms[0];
  if (!arm) return <main className="page"><div className="card">No classes yet.</div></main>;
  const term = Number(sp.term) || school.current_term;
  const session = sp.session || school.current_session;
  const [{ data: students }, { data: reports }] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name, admission_no").eq("class_arm_id", arm.id).eq("status", "active").order("last_name"),
    supabase.from("term_reports").select("*").eq("class_arm_id", arm.id).eq("session", session).eq("term", term),
  ]);
  const list = students || [];
  const done = new Map((reports || []).map((r: any) => [r.student_id, r]));
  const idx = Math.max(0, list.findIndex((s: any) => s.id === sp.student));
  const st: any = list[idx];
  const next: any = list[idx + 1];
  const r: any = st ? done.get(st.id) || {} : {};
  const isAdmin = profile.role === "admin";
  const q = `arm=${arm.id}&term=${term}&session=${encodeURIComponent(session)}`;

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Comments and ratings · {arm.label}</h1>
          <p className="muted small">{session} · {TERM_NAMES[term]} term · {done.size} of {list.length} students done</p>
        </div>
        <Link className="btn ghost small" href={`/results/broadsheet?${q}`}>Broadsheet</Link>
      </div>
      <form className="card row" method="get" action="/results/remarks">
        <label className="field" htmlFor="rm-arm">Class
          <AutoSelect id="rm-arm" name="arm" defaultValue={arm.id}>{arms.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}</AutoSelect>
        </label>
        <label className="field" htmlFor="rm-term">Term
          <AutoSelect id="rm-term" name="term" defaultValue={String(term)}>{[1, 2, 3].map((n) => <option key={n} value={n}>{TERM_NAMES[n]} term</option>)}</AutoSelect>
        </label>
      </form>
      {sp.saved && <div className="notice">Saved.{next ? "" : " That was the last student in this class."}</div>}
      {!list.length ? <div className="card">No active students in {arm.label}.</div> : (
        <section className="split">
          <ul className="weeks" aria-label="Students">
            {list.map((s: any) => (
              <li key={s.id}>
                <Link href={`/results/remarks?${q}&student=${s.id}`} className={s.id === st?.id ? "sel" : ""}>
                  <span className="wk">{done.has(s.id) ? "✓" : ""}</span>
                  <span>{s.last_name}, {s.first_name}</span>
                  {done.has(s.id) && <span className="chip covered">Done</span>}
                </Link>
              </li>
            ))}
          </ul>
          {st && (
            <form className="card" action={saveRemarks}>
              <input type="hidden" name="student_id" value={st.id} /><input type="hidden" name="arm_id" value={arm.id} />
              <input type="hidden" name="session" value={session} /><input type="hidden" name="term" value={term} />
              <input type="hidden" name="next_student" value={next?.id || ""} />
              <div>
                <div className="eyebrow">{st.admission_no}</div>
                <h3>{st.first_name} {st.last_name}</h3>
              </div>
              <div className="grid2">
                <div className="block">
                  <h4>Affective domain (behaviour)</h4>
                  {AFFECTIVE.map((k) => <Rating key={k} name={`aff_${k}`} label={k} value={r.affective?.[k]} />)}
                </div>
                <div className="block">
                  <h4>Psychomotor skills</h4>
                  {PSYCHOMOTOR.map((k) => <Rating key={k} name={`psy_${k}`} label={k} value={r.psychomotor?.[k]} />)}
                </div>
              </div>
              <label className="field" htmlFor="tc">Class teacher's comment
                <input id="tc" name="teacher_comment" defaultValue={r.teacher_comment || ""} placeholder="e.g. A diligent pupil. Keep it up." />
              </label>
              <label className="field" htmlFor="pc">Head teacher / principal's comment {isAdmin ? "" : "(admin only)"}
                <input id="pc" name="principal_comment" defaultValue={r.principal_comment || ""} disabled={!isAdmin} />
              </label>
              <div className="row">
                <button className="btn">{next ? "Save and next student" : "Save"}</button>
                <Link className="small" href={`/results/report/${st.id}?term=${term}&session=${encodeURIComponent(session)}`}>Preview report card</Link>
              </div>
            </form>
          )}
        </section>
      )}
    </main>
  );
}

function Rating({ name, label, value }: { name: string; label: string; value?: number }) {
  return (
    <label className="row" style={{ justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6 }}>
      <span>{label}</span>
      <select name={name} defaultValue={value ? String(value) : ""} aria-label={label}>
        <option value="">—</option>
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} · {RATING_TEXT[n]}</option>)}
      </select>
    </label>
  );
}
