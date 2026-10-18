import { requireMember, TERM_NAMES } from "@/lib/session";
import { loadArms } from "@/lib/arms";
import AutoSelect from "@/components/AutoSelect";
import { saveAttendance } from "./actions";

type Search = { arm?: string; day?: string; saved?: string };

function lagosToday() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function Attendance({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember(["admin", "teacher"]);
  const arms = await loadArms(supabase, school.id, school);
  const arm: any = arms.find((a: any) => a.id === sp.arm) || arms.find((a: any) => a.class_teacher_id === profile.id) || arms[0];
  if (!arm) return <main className="page"><div className="card">No classes yet.</div></main>;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.day || "") ? sp.day! : lagosToday();
  const [{ data: students }, { data: marks }, { data: termMarks }] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name, admission_no").eq("class_arm_id", arm.id).eq("status", "active").order("last_name"),
    supabase.from("attendance").select("student_id, status").eq("class_arm_id", arm.id).eq("day", day),
    supabase.from("attendance").select("student_id, status, day").eq("class_arm_id", arm.id).eq("session", school.current_session).eq("term", school.current_term),
  ]);
  const today = new Map((marks || []).map((m: any) => [m.student_id, m.status]));
  const days = new Set((termMarks || []).map((m: any) => m.day));
  const tally = new Map<string, { p: number; a: number; l: number }>();
  for (const m of termMarks || []) {
    const t = tally.get(m.student_id) || { p: 0, a: 0, l: 0 };
    if (m.status === "present") t.p++; else if (m.status === "absent") t.a++; else t.l++;
    tally.set(m.student_id, t);
  }
  const list = students || [];
  const marked = list.length > 0 && list.every((s: any) => today.has(s.id));
  const presentToday = list.filter((s: any) => today.get(s.id) !== "absent" && today.has(s.id)).length;

  return (
    <main className="page" style={{ maxWidth: 960 }}>
      <div>
        <h1>Attendance register</h1>
        <p className="muted small">{school.current_session} · {TERM_NAMES[school.current_term]} term · {days.size} school days recorded this term for {arm.label}</p>
      </div>
      <form className="card row" method="get" action="/attendance">
        <label className="field" htmlFor="at-arm">Class
          <AutoSelect id="at-arm" name="arm" defaultValue={arm.id}>{arms.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}</AutoSelect>
        </label>
        <label className="field" htmlFor="at-day">Date<input id="at-day" type="date" name="day" defaultValue={day} /></label>
        <button className="btn ghost">Open register</button>
      </form>
      {sp.saved && <div className="notice">Register saved for {new Date(day).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}.</div>}
      {!list.length ? <div className="card">No active students in {arm.label}.</div> : (
        <form className="card table-wrap" action={saveAttendance}>
          <input type="hidden" name="arm_id" value={arm.id} /><input type="hidden" name="day" value={day} />
          <input type="hidden" name="student_ids" value={list.map((s: any) => s.id).join(",")} />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2>{arm.label} · {new Date(day).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</h2>
            <span className={`chip ${marked ? "approved" : "draft"}`}>{marked ? `Marked · ${presentToday}/${list.length} present` : "Not marked yet"}</span>
          </div>
          <table className="list">
            <thead><tr><th>Student</th><th>Present</th><th>Late</th><th>Absent</th><th>This term (P / L / A)</th></tr></thead>
            <tbody>
              {list.map((s: any) => {
                const cur = today.get(s.id) || "present";
                const t = tally.get(s.id) || { p: 0, a: 0, l: 0 };
                return (
                  <tr key={s.id}>
                    <td><b>{s.last_name}, {s.first_name}</b></td>
                    {["present", "late", "absent"].map((st) => (
                      <td key={st}><input type="radio" name={`a_${s.id}`} value={st} defaultChecked={cur === st} aria-label={`${s.first_name} ${st}`} style={{ width: 22, height: 22 }} /></td>
                    ))}
                    <td className="small">{t.p} / {t.l} / <span className={t.a > 2 ? "behind" : ""}>{t.a}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div><button className="btn">Save register</button></div>
        </form>
      )}
    </main>
  );
}
