import Link from "next/link";
import { requireMember } from "@/lib/session";
import { schoolLevels } from "@/lib/levels";
import { classSubjects } from "@/lib/subjects";
import AutoSelect from "@/components/AutoSelect";
import { addSubject, toggleSubject } from "../actions";

export default async function SubjectsPage({ searchParams }: { searchParams: Promise<{ class?: string; added?: string }> }) {
  const sp = await searchParams;
  const { supabase, school } = await requireMember(["admin"]);
  const levels = schoolLevels(school);
  const { data: classesRaw } = await supabase.from("class_levels").select("code, name, level, sort_order").order("sort_order");
  const classes = (classesRaw || []).filter((c: any) => levels.includes(c.level));
  const cls = classes.find((c: any) => c.code === sp.class) || classes[0];
  const subjects = cls ? await classSubjects(supabase, school.id, cls.code) : [];
  return (
    <main className="page" style={{ maxWidth: 900 }}>
      <div>
        <Link href="/settings" className="small">← School settings</Link>
        <h1>Subjects per class</h1>
        <p className="muted small">Switch off subjects your school does not offer, or add your own. These lists drive score entry and report cards.</p>
      </div>
      {sp.added && <div className="notice">Subject added.</div>}
      <form className="card row" method="get" action="/settings/subjects">
        <label className="field" htmlFor="sb-class">Class
          <AutoSelect id="sb-class" name="class" defaultValue={cls?.code}>
            {classes.map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </AutoSelect>
        </label>
        <noscript><button className="btn">Show</button></noscript>
      </form>
      <section className="card table-wrap">
        <table className="list">
          <thead><tr><th>Subject</th><th>Source</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id}>
                <td><b>{s.name}</b></td>
                <td className="small muted">{s.default ? "Default list" : "Added by school"}</td>
                <td><span className={`chip ${s.enabled ? "approved" : "draft"}`}>{s.enabled ? "Offered" : "Off"}</span></td>
                <td>
                  <form action={toggleSubject}>
                    <input type="hidden" name="class_code" value={cls.code} />
                    <input type="hidden" name="subject_id" value={s.id} />
                    <input type="hidden" name="enabled" value={s.enabled ? "0" : "1"} />
                    <button className={`btn small ${s.enabled ? "ghost" : ""}`}>{s.enabled ? "Switch off" : "Switch on"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {cls && (
        <form className="card row" action={addSubject}>
          <input type="hidden" name="class_code" value={cls.code} />
          <label className="field" htmlFor="sb-name" style={{ flex: "1 1 260px" }}>Add a subject to {cls.name}
            <input id="sb-name" name="name" required placeholder="e.g. Yoruba, Hausa, Igbo, Data Processing" />
          </label>
          <button className="btn">Add subject</button>
        </form>
      )}
    </main>
  );
}
