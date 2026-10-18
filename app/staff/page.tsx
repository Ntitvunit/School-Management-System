import { requireMember } from "@/lib/session";
import { loadArms } from "@/lib/arms";
import { activeClassSubjects } from "@/lib/subjects";
import AutoSelect from "@/components/AutoSelect";
import { assignSubject, changeRole, removeMember, setClassTeacher, unassignSubject } from "./actions";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; arm?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember(["admin"]);
  const [{ data: people }, arms, { data: assignments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, created_at").eq("school_id", school.id).order("role").order("full_name"),
    loadArms(supabase, school.id, school),
    supabase.from("teacher_subjects").select("teacher_id, class_arm_id, subject_id, subjects(name)").eq("school_id", school.id),
  ]);
  const staff = (people || []).filter((p: any) => ["admin", "teacher", "bursar"].includes(p.role));
  const others = (people || []).filter((p: any) => !["admin", "teacher", "bursar"].includes(p.role));
  const teachers = staff.filter((p: any) => p.role !== "bursar");
  const nameOf = new Map((people || []).map((p: any) => [p.id, p.full_name]));
  const armOf = new Map<string, string>(arms.map((a: any) => [a.id, a.label]));
  const selArm: any = arms.find((a: any) => a.id === sp.arm) || arms[0];
  const subjects = selArm ? await activeClassSubjects(supabase, school.id, selArm.class_code) : [];

  return (
    <main className="page" style={{ maxWidth: 1000 }}>
      <div>
        <h1>Staff and roles</h1>
        <p className="muted small">People join with the school code as teachers or parents. Promote staff to admin or bursar here. Students join with their admission number.</p>
      </div>
      {sp.saved && <div className="notice">{sp.saved === "removed" ? "Removed from the school." : "Saved."}</div>}
      {sp.error && <div className="error">{sp.error}</div>}

      <section className="card table-wrap">
        <h2>Staff</h2>
        <table className="list">
          <thead><tr><th>Name</th><th>Role</th><th>Change role</th><th></th></tr></thead>
          <tbody>
            {staff.map((p: any) => (
              <tr key={p.id}>
                <td><b>{p.full_name || "—"}</b>{p.id === profile.id && <span className="small muted"> (you)</span>}</td>
                <td style={{ textTransform: "capitalize" }}>{p.role}</td>
                <td>
                  {p.id !== profile.id && (
                    <form action={changeRole} className="row" style={{ gap: 6 }}>
                      <input type="hidden" name="user_id" value={p.id} />
                      <select name="role" defaultValue={p.role} aria-label={`Role for ${p.full_name}`}>
                        <option value="teacher">Teacher</option><option value="bursar">Bursar</option><option value="admin">Admin</option>
                      </select>
                      <button className="btn ghost small">Save</button>
                    </form>
                  )}
                </td>
                <td>
                  {p.id !== profile.id && (
                    <form action={removeMember}><input type="hidden" name="user_id" value={p.id} /><button className="btn warn small">Remove</button></form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card table-wrap" id="classes">
        <h2>Class teachers</h2>
        <p className="small muted">The class teacher writes report card comments and takes attendance for the class.</p>
        <table className="list">
          <thead><tr><th>Class</th><th>Class teacher</th></tr></thead>
          <tbody>
            {arms.map((a: any) => (
              <tr key={a.id}>
                <td><b>{a.label}</b></td>
                <td>
                  <form action={setClassTeacher} className="row" style={{ gap: 6 }}>
                    <input type="hidden" name="arm_id" value={a.id} />
                    <select name="teacher_id" defaultValue={a.class_teacher_id || ""} aria-label={`Class teacher for ${a.label}`}>
                      <option value="">Not assigned</option>
                      {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                    <button className="btn ghost small">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" id="subjects">
        <h2>Subject teachers</h2>
        <form className="row" method="get" action="/staff#subjects">
          <label className="field" htmlFor="st-arm">Class
            <AutoSelect id="st-arm" name="arm" defaultValue={selArm?.id}>
              {arms.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </AutoSelect>
          </label>
        </form>
        {selArm && (
          <form action={assignSubject} className="row">
            <input type="hidden" name="arm_id" value={selArm.id} />
            <label className="field" htmlFor="as-subject">Subject
              <select id="as-subject" name="subject_id">{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </label>
            <label className="field" htmlFor="as-teacher">Teacher
              <select id="as-teacher" name="teacher_id">{teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select>
            </label>
            <button className="btn ghost">Assign</button>
          </form>
        )}
        <div className="table-wrap">
          <table className="list">
            <thead><tr><th>Class</th><th>Subject</th><th>Teacher</th><th></th></tr></thead>
            <tbody>
              {(assignments || []).sort((a: any, b: any) => (armOf.get(a.class_arm_id) || "").localeCompare(armOf.get(b.class_arm_id) || "")).map((a: any) => (
                <tr key={`${a.teacher_id}-${a.class_arm_id}-${a.subject_id}`}>
                  <td>{armOf.get(a.class_arm_id)}</td><td>{a.subjects?.name}</td><td>{nameOf.get(a.teacher_id)}</td>
                  <td>
                    <form action={unassignSubject}>
                      <input type="hidden" name="teacher_id" value={a.teacher_id} /><input type="hidden" name="arm_id" value={a.class_arm_id} />
                      <input type="hidden" name="subject_id" value={a.subject_id} /><button className="btn warn small">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card table-wrap">
        <h2>Parents and students with accounts</h2>
        <table className="list">
          <thead><tr><th>Name</th><th>Role</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            {others.map((p: any) => (
              <tr key={p.id}>
                <td>{p.full_name || "—"}</td><td style={{ textTransform: "capitalize" }}>{p.role}</td>
                <td>{new Date(p.created_at).toLocaleDateString("en-GB")}</td>
                <td><form action={removeMember}><input type="hidden" name="user_id" value={p.id} /><button className="btn warn small">Remove</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
