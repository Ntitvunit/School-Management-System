import { requireMember, TERM_NAMES } from "@/lib/session";
import { addArm, updateSchool, updateTheme } from "./actions";
import { THEMES, resolveTheme } from "@/lib/theme";

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; welcome?: string }> }) {
  const sp = await searchParams;
  const { supabase, school } = await requireMember(["admin"]);
  const [{ data: people }, { data: arms }, { data: classes }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, created_at").eq("school_id", school.id).order("created_at"),
    supabase.from("class_arms").select("id, arm, class_code, class_levels(name, sort_order)").eq("school_id", school.id),
    supabase.from("class_levels").select("code, name, sort_order").order("sort_order"),
  ]);
  const current = resolveTheme(school);
  const sortedArms = (arms || []).sort((a: any, b: any) => a.class_levels.sort_order - b.class_levels.sort_order || a.arm.localeCompare(b.arm));
  return (
    <main className="page" style={{ maxWidth: 960 }}>
      <h1>School settings</h1>
      {sp.welcome && <div className="notice">Your school is ready. Share the code below with your teachers and parents so they can join.</div>}
      {sp.saved && <div className="notice">{sp.saved === "theme" ? "Theme saved. Everyone in your school now sees these colours." : "Saved."}</div>}

      <section className="card">
        <h2>School code</h2>
        <div><span className="code">{school.join_code}</span></div>
        <p className="small muted">Teachers and parents create an account, choose “Join a school”, and enter this code.</p>
      </section>

      <form className="card" action={updateSchool}>
        <h2>School and calendar</h2>
        <div className="row">
          <label className="field" htmlFor="s-name" style={{ flex: "1 1 260px" }}>School name
            <input id="s-name" name="name" defaultValue={school.name} required />
          </label>
          <label className="field" htmlFor="s-motto" style={{ flex: "1 1 260px" }}>Motto (shown under the name)
            <input id="s-motto" name="motto" defaultValue={school.motto || ""} placeholder="e.g. Knowledge and Character" />
          </label>
          <label className="field" htmlFor="s-session">Session
            <input id="s-session" name="session" defaultValue={school.current_session} size={10} />
          </label>
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
        </div>
        <div><button className="btn">Save</button></div>
        <p className="small muted">The current week drives “This week” for teachers and parents, and the expected line on the coverage report.</p>
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
          <label className="field" htmlFor="t-primary">Custom main colour
            <input id="t-primary" type="color" name="brand_primary" defaultValue={school.brand_primary || current.primary} />
          </label>
          <label className="field" htmlFor="t-accent">Custom second colour
            <input id="t-accent" type="color" name="brand_accent" defaultValue={school.brand_accent || current.accent} />
          </label>
          <button className="btn">Save theme</button>
        </div>
        <p className="small muted">Custom colours are used only when “Custom” is selected. Very light colours are darkened automatically so text stays readable.</p>
      </form>

      <section className="card">
        <h2>Classes and arms</h2>
        <p className="small">{sortedArms.map((a: any) => `${a.class_levels.name} ${a.arm}`).join(" · ")}</p>
        <form className="row" action={addArm}>
          <label className="field" htmlFor="a-class">Class
            <select id="a-class" name="class_code">{(classes || []).map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
          </label>
          <label className="field" htmlFor="a-arm">New arm
            <input id="a-arm" name="arm" placeholder="B" size={6} required />
          </label>
          <button className="btn ghost">Add arm</button>
        </form>
      </section>

      <section className="card table-wrap">
        <h2>People in your school</h2>
        <table className="list">
          <thead><tr><th>Name</th><th>Role</th><th>Joined</th></tr></thead>
          <tbody>
            {(people || []).map((p: any) => (
              <tr key={p.id}><td>{p.full_name || "—"}</td><td>{p.role}</td><td>{new Date(p.created_at).toLocaleDateString("en-GB")}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
