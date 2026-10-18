import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { loadArms } from "@/lib/arms";
import { activeClassSubjects } from "@/lib/subjects";
import { bands, gradeFor, ordinal, rankMap } from "@/lib/grading";
import AutoSelect from "@/components/AutoSelect";
import { setPublished } from "../actions";

type Search = { arm?: string; term?: string; session?: string };

export default async function Broadsheet({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember(["admin", "teacher"]);
  const arms = await loadArms(supabase, school.id, school);
  const arm: any = arms.find((a: any) => a.id === sp.arm) || arms[0];
  if (!arm) return <main className="page"><div className="card">No classes yet.</div></main>;
  const term = Number(sp.term) || school.current_term;
  const session = sp.session || school.current_session;
  const [subjects, { data: students }, { data: scores }, { data: pub }] = await Promise.all([
    activeClassSubjects(supabase, school.id, arm.class_code),
    supabase.from("students").select("id, first_name, last_name, admission_no").eq("class_arm_id", arm.id).eq("status", "active").order("last_name"),
    supabase.from("scores").select("student_id, subject_id, total").eq("class_arm_id", arm.id).eq("session", session).eq("term", term),
    supabase.from("result_publications").select("published_at").match({ class_arm_id: arm.id, session, term }).maybeSingle(),
  ]);
  const bs = bands(school);
  const cell = new Map<string, number>();
  for (const s of scores || []) if (s.total !== null) cell.set(`${s.student_id}|${s.subject_id}`, Number(s.total));
  const usedSubjects = subjects.filter((sb) => (students || []).some((st: any) => cell.has(`${st.id}|${sb.id}`)));
  const shown = usedSubjects.length ? usedSubjects : subjects;
  const rows = (students || []).map((st: any) => {
    const vals = shown.map((sb) => cell.get(`${st.id}|${sb.id}`)).filter((v) => v !== undefined) as number[];
    const total = vals.reduce((a, b) => a + b, 0);
    return { st, vals, total, avg: vals.length ? total / vals.length : null };
  });
  const pos = rankMap(rows.filter((r) => r.avg !== null).map((r) => [r.st.id, r.avg as number] as [string, number]));
  const classAvg = rows.filter((r) => r.avg !== null);
  const overall = classAvg.length ? classAvg.reduce((a, r) => a + (r.avg as number), 0) / classAvg.length : null;

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Broadsheet · {arm.label}</h1>
          <p className="muted small">{session} · {TERM_NAMES[term]} term · {rows.length} students{overall !== null && ` · class average ${overall.toFixed(1)}`}</p>
        </div>
        <div className="row">
          <Link className="btn ghost small" href={`/results?arm=${arm.id}&term=${term}`}>Enter scores</Link>
          <Link className="btn ghost small" href={`/results/remarks?arm=${arm.id}&term=${term}`}>Comments and ratings</Link>
        </div>
      </div>
      <form className="card row" method="get" action="/results/broadsheet">
        <label className="field" htmlFor="b-arm">Class
          <AutoSelect id="b-arm" name="arm" defaultValue={arm.id}>{arms.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}</AutoSelect>
        </label>
        <label className="field" htmlFor="b-term">Term
          <AutoSelect id="b-term" name="term" defaultValue={String(term)}>{[1, 2, 3].map((n) => <option key={n} value={n}>{TERM_NAMES[n]} term</option>)}</AutoSelect>
        </label>
      </form>
      <div className="row">
        <span className={`chip ${pub ? "approved" : "draft"}`}>{pub ? "Published" : "Not published"}</span>
        {profile.role === "admin" && (
          <form action={setPublished}>
            <input type="hidden" name="arm_id" value={arm.id} /><input type="hidden" name="session" value={session} />
            <input type="hidden" name="term" value={term} /><input type="hidden" name="publish" value={pub ? "0" : "1"} />
            <button className={`btn small ${pub ? "warn" : ""}`}>{pub ? "Unpublish" : "Publish to parents and students"}</button>
          </form>
        )}
        <span className="small muted">{pub ? "Parents and students can now see these results (and scratch-card PINs work)." : "Parents and students cannot see these results until you publish."}</span>
      </div>
      <div className="card table-wrap">
        <table className="list broadsheet">
          <thead>
            <tr>
              <th>Student</th>
              {shown.map((sb) => <th key={sb.id} title={sb.name} style={{ textAlign: "center" }}>{sb.name.length > 14 ? sb.name.slice(0, 12) + "…" : sb.name}</th>)}
              <th style={{ textAlign: "center" }}>Total</th><th style={{ textAlign: "center" }}>Average</th><th style={{ textAlign: "center" }}>Position</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.st.id}>
                <td><b>{r.st.last_name}, {r.st.first_name}</b></td>
                {shown.map((sb) => {
                  const v = cell.get(`${r.st.id}|${sb.id}`);
                  return <td key={sb.id} style={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{v ?? <span className="muted">—</span>}{v !== undefined && <span className="small muted"> {gradeFor(v, bs).grade}</span>}</td>;
                })}
                <td style={{ textAlign: "center", fontWeight: 700 }}>{r.vals.length ? r.total : "—"}</td>
                <td style={{ textAlign: "center" }}>{r.avg !== null ? r.avg.toFixed(1) : "—"}</td>
                <td style={{ textAlign: "center", fontWeight: 700 }}>{ordinal(pos.get(r.st.id))}</td>
                <td><Link className="small" href={`/results/report/${r.st.id}?term=${term}&session=${encodeURIComponent(session)}`}>Report card</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
