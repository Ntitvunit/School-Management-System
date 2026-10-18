import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { addArm, updateAssessment, updateLevels, updateSchool, updateTheme } from "./actions";
import { THEMES, resolveTheme } from "@/lib/theme";
import { LEVELS, schoolLevels } from "@/lib/levels";
import { bands, parts } from "@/lib/grading";
import { loadArms } from "@/lib/arms";

const SAVED: Record<string, string> = {
  "1": "Saved.",
  theme: "Theme saved. Everyone in your school now sees these colours.",
  levels: "Levels saved. Classes for the selected levels now appear across the system.",
  assessment: "Assessment and grading saved.",
};

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; welcome?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase, school } = await requireMember(["admin"]);
  const [arms, { data: classes }] = await Promise.all([
    loadArms(supabase, school.id, school),
    supabase.from("class_levels").select("code, name, sort_order, level").order("sort_order"),
  ]);
  const levels = schoolLevels(school);
  const current = resolveTheme(school);
  const ps = parts(school);
  const rows = [...ps, ...Array.from({ length: Math.max(0, 6 - ps.length) }, () => ({ key: "", label: "", max: 0 }))];
  const gradingText = bands(school).map((b) => `${b.min} ${b.grade} ${b.remark}`).join("\n");
  const total = ps.reduce((a, p) => a + Number(p.max), 0);

  return (
    <main className="page" style={{ maxWidth: 980 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>School settings</h1>
        <div className="row">
          <Link className="btn ghost small" href="/settings/subjects">Subjects per class</Link>
          <Link className="btn ghost small" href="/staff">Staff and roles</Link>
          <Link className="btn ghost small" href="/results/pins">Result PINs</Link>
        </div>
      </div>
      {sp.welcome && <div className="notice">Your school is ready. Share the code below with your teachers and parents so they can join.</div>}
      {sp.saved && <div className="notice">{SAVED[sp.saved] || "Saved."}</div>}
      {sp.error && <div className="error">{sp.error === "parts" ? "Add at least one assessment column." : "Add at least one grade line, e.g. 70 A Excellent."}</div>}

      <section className="card">
        <h2>School code</h2>
        <div><span className="code">{school.join_code}</span></div>
        <p className="small muted">Teachers, parents and students create an account, choose “Join a school”, and enter this code. Students also need their admission number.</p>
      </section>

      <form className="card" action={updateSchool}>
        <h2>School and calendar</h2>
        <div className="grid2">
          <label className="field" htmlFor="s-name">School name<input id="s-name" name="name" defaultValue={school.name} required /></label>
          <label className="field" htmlFor="s-motto">Motto<input id="s-motto" name="motto" defaultValue={school.motto || ""} placeholder="e.g. Knowledge and Character" /></label>
          <label className="field" htmlFor="s-addr">Address (on report cards and receipts)<input id="s-addr" name="address" defaultValue={school.address || ""} /></label>
          <label className="field" htmlFor="s-phone">Phone<input id="s-phone" name="phone" defaultValue={school.phone || ""} /></label>
          <label className="field" htmlFor="s-session">Session<input id="s-session" name="session" defaultValue={school.current_session} /></label>
          <label className="field" htmlFor="s-term">Current term
            <select id="s-term" name="term" defaultValue={String(school.current_term)}>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{TERM_NAMES[n]} term</option>)}
            </select>
          </label>
          <label className="field" htmlFor="s-week">Current week
            <select id="s-week" name="week" defaultValue={String(school.current_week)}>
              {Array.from({ length: 13 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Week {n}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="s-next">Next term begins (on report cards)<input id="s-next" type="date" name="next_term_begins" defaultValue={school.next_term_begins || ""} /></label>
        </div>
        <div><button className="btn">Save</button></div>
      </form>

      <form className="card" action={updateLevels} id="levels">
        <h2>Levels your school runs</h2>
        <p className="small muted">Only classes for the levels you tick appear in class lists, results and attendance.</p>
        <div className="grid2">
          {LEVELS.map((l) => (
            <label key={l.id} className="row" style={{ gap: 8, alignItems: "center" }}>
              <input type="checkbox" name={`level_${l.id}`} defaultChecked={levels.includes(l.id)} style={{ width: 20, height: 20 }} />
              <span>{l.name}</span>
            </label>
          ))}
        </div>
        <div><button className="btn">Save levels</button></div>
      </form>

      <form className="card" action={updateTheme} id="theme">
        <h2>Theme and colours</h2>
        <p className="small muted">Pick a ready-made theme, or choose Custom and set your school's own colours. Everyone in your school sees the same theme.</p>
        <div className="themes">
          {THEMES.map((t) => (
            <label key={t.id} className="theme-opt">
              <input type="radio" name="theme" value={t.id} defaultChecked={school.theme === t.id || (!school.theme && t.id === "chalkboard")} />
              <span className="swatch"><span style={{ background: t.primary }} /><span style={{ background: t.accent }} /></span>
              <span className="nm">{t.name}</span>
            </label>
          ))}
          <label className="theme-opt">
            <input type="radio" name="theme" value="custom" defaultChecked={school.theme === "custom"} />
            <span className="swatch"><span style={{ background: current.primary }} /><span style={{ background: current.accent }} /></span>
            <span className="nm">Custom (school colours)</span>
          </label>
        </div>
        <div className="row">
          <label className="field" htmlFor="t-primary">Custom main colour<input id="t-primary" type="color" name="brand_primary" defaultValue={school.brand_primary || current.primary} /></label>
          <label className="field" htmlFor="t-accent">Custom second colour<input id="t-accent" type="color" name="brand_accent" defaultValue={school.brand_accent || current.accent} /></label>
          <button className="btn">Save theme</button>
        </div>
      </form>

      <form className="card" action={updateAssessment} id="assessment">
        <h2>Assessment and grading</h2>
        <p className="small muted">Columns teachers fill in for each subject. Current total: <b>{total}</b> marks{total !== 100 && " (usually 100)"}.</p>
        <div className="table-wrap">
          <table className="list" style={{ maxWidth: 520 }}>
            <thead><tr><th>Column name</th><th>Maximum mark</th></tr></thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={i}>
                  <td><input type="hidden" name={`p_key_${i}`} value={p.key} /><input name={`p_label_${i}`} defaultValue={p.label} placeholder={i < 3 ? "" : "(optional)"} aria-label={`Column ${i + 1} name`} /></td>
                  <td><input name={`p_max_${i}`} type="number" min={0} max={100} defaultValue={p.max || ""} aria-label={`Column ${i + 1} maximum`} style={{ width: 90 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label className="field" htmlFor="grading">Grading scale (one line each: minimum score, grade, remark)
          <textarea id="grading" name="grading" defaultValue={gradingText} style={{ minHeight: 170, fontFamily: "ui-monospace, Menlo, monospace" }} />
        </label>
        <p className="small muted">WAEC-style example: <code>75 A1 Excellent</code>, <code>70 B2 Very good</code>, … <code>0 F9 Fail</code>.</p>
        <label className="row" style={{ gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="block" defaultChecked={(school as any).block_results_if_owing} style={{ width: 20, height: 20 }} />
          <span>Hold results for parents and students until the term's school fees are fully paid</span>
        </label>
        <div><button className="btn">Save assessment and grading</button></div>
      </form>

      <section className="card" id="arms">
        <h2>Classes and arms</h2>
        <p className="small">{arms.map((a: any) => a.label).join(" · ")}</p>
        <form className="row" action={addArm}>
          <label className="field" htmlFor="a-class">Class
            <select id="a-class" name="class_code">
              {(classes || []).filter((c: any) => levels.includes(c.level)).map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="a-arm">New arm<input id="a-arm" name="arm" placeholder="B" size={6} required /></label>
          <button className="btn ghost">Add arm</button>
        </form>
      </section>
    </main>
  );
}
