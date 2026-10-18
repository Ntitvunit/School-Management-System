import Link from "next/link";
import { requireMember } from "@/lib/session";
import { loadArms } from "@/lib/arms";
import AutoSelect from "@/components/AutoSelect";

type Search = { arm?: string; q?: string; status?: string };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember(["admin", "teacher"]);
  const arms = await loadArms(supabase, school.id);
  const status = sp.status || "active";

  let q = supabase.from("students")
    .select("id, admission_no, first_name, last_name, other_names, gender, guardian_phone, class_arm_id, status")
    .eq("school_id", school.id).order("last_name").order("first_name").limit(500);
  if (status !== "all") q = q.eq("status", status);
  if (sp.arm === "none") q = q.is("class_arm_id", null);
  else if (sp.arm) q = q.eq("class_arm_id", sp.arm);
  const term = (sp.q || "").trim().replace(/[%,()]/g, "");
  if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,admission_no.ilike.%${term}%`);
  const { data: students, error } = await q;
  const armLabel = new Map(arms.map((a: any) => [a.id, a.label]));
  const isAdmin = profile.role === "admin";

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Students</h1>
          <p className="muted small">{students?.length ?? 0} shown{isAdmin ? "" : " · view only (the school admin adds and edits students)"}</p>
        </div>
        {isAdmin && <Link className="btn" href="/students/new">Admit a student</Link>}
      </div>
      <form className="card row" method="get" action="/students">
        <label className="field" htmlFor="s-arm">Class
          <AutoSelect id="s-arm" name="arm" defaultValue={sp.arm || ""}>
            <option value="">All classes</option>
            {arms.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
            <option value="none">Not assigned</option>
          </AutoSelect>
        </label>
        <label className="field" htmlFor="s-status">Status
          <AutoSelect id="s-status" name="status" defaultValue={status}>
            <option value="active">Active</option><option value="graduated">Graduated</option>
            <option value="withdrawn">Withdrawn</option><option value="all">All</option>
          </AutoSelect>
        </label>
        <label className="field" htmlFor="s-q" style={{ flex: "1 1 220px" }}>Search name or admission no.
          <input id="s-q" name="q" defaultValue={sp.q || ""} placeholder="e.g. Okafor or BFA/014" />
        </label>
        <button className="btn ghost">Search</button>
      </form>
      {error && <div className="error">{error.message}</div>}
      <div className="card table-wrap">
        {!students?.length ? (
          <p className="muted">No students found.{isAdmin && <> <Link href="/students/new">Admit the first student</Link>.</>}</p>
        ) : (
          <table className="list">
            <thead><tr><th>Name</th><th>Admission no.</th><th>Class</th><th>Gender</th><th>Guardian phone</th></tr></thead>
            <tbody>
              {students.map((s: any) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/students/${s.id}`} className="person" style={{ textDecoration: "none", color: "inherit" }}>
                      <span className={`avatar ${s.gender === "female" ? "f" : ""}`}>{(s.first_name[0] || "") + (s.last_name[0] || "")}</span>
                      <b>{s.last_name}, {s.first_name}</b>
                    </Link>
                  </td>
                  <td>{s.admission_no}</td>
                  <td>{armLabel.get(s.class_arm_id) || <span className="muted">—</span>}</td>
                  <td style={{ textTransform: "capitalize" }}>{s.gender || "—"}</td>
                  <td>{s.guardian_phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
