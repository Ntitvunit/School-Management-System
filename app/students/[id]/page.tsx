import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import { loadArms } from "@/lib/arms";
import StudentForm from "@/components/StudentForm";
import { linkParent, unlinkParent, updateStudent } from "../actions";

function age(dob?: string | null) {
  if (!dob) return null;
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}

export default async function StudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; edit?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember();
  const { data: s } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const arms = await loadArms(supabase, school.id);
  const arm = arms.find((a: any) => a.id === s.class_arm_id);
  const isAdmin = profile.role === "admin";
  const isParent = profile.role === "parent";

  const { data: links } = await supabase.from("student_guardians").select("parent_id, relationship").eq("student_id", id);
  const { data: parents } = isAdmin
    ? await supabase.from("profiles").select("id, full_name").eq("school_id", school.id).eq("role", "parent").order("full_name")
    : { data: [] as any[] };
  const parentName = new Map((parents || []).map((p: any) => [p.id, p.full_name]));
  const linked = new Set((links || []).map((l: any) => l.parent_id));

  const thisWeek = arm
    ? (await supabase.from("curriculum_topics").select("id, topic, subjects(name)")
        .eq("class_code", arm.class_code).eq("term", school.current_term).eq("week_start", school.current_week).eq("week_type", "teaching")).data
    : null;

  const full = [s.first_name, s.other_names, s.last_name].filter(Boolean).join(" ");
  return (
    <main className="page" style={{ maxWidth: 960 }}>
      <div>
        <Link href={isParent ? "/children" : "/students"} className="small">← {isParent ? "My children" : "All students"}</Link>
        <div className="person" style={{ marginTop: 8 }}>
          <span className={`avatar ${s.gender === "female" ? "f" : ""}`} style={{ width: 56, height: 56, fontSize: 18 }}>
            {(s.first_name[0] || "") + (s.last_name[0] || "")}
          </span>
          <div>
            <h1>{full}</h1>
            <div className="muted small">{s.admission_no} · {arm?.label || "No class assigned"} · <span style={{ textTransform: "capitalize" }}>{s.status}</span></div>
          </div>
        </div>
      </div>
      {sp.saved && <div className="notice">{sp.saved === "new" ? "Student admitted." : sp.saved === "link" ? "Parent account linked." : "Saved."}</div>}

      {isAdmin && sp.edit ? (
        <StudentForm action={updateStudent} arms={arms.map((a: any) => ({ id: a.id, label: a.label }))} student={s} submitLabel="Save changes" />
      ) : (
        <section className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2>Profile</h2>
            {isAdmin && <Link className="btn ghost small" href={`/students/${id}?edit=1`}>Edit</Link>}
          </div>
          <dl className="kv">
            <dt>Gender</dt><dd style={{ textTransform: "capitalize" }}>{s.gender || "—"}</dd>
            <dt>Date of birth</dt><dd>{s.date_of_birth ? `${new Date(s.date_of_birth).toLocaleDateString("en-GB")} (age ${age(s.date_of_birth)})` : "—"}</dd>
            <dt>Admitted</dt><dd>{s.admitted_on ? new Date(s.admitted_on).toLocaleDateString("en-GB") : "—"}</dd>
            <dt>Parent / guardian</dt><dd>{s.guardian_name || "—"}</dd>
            <dt>Phone</dt><dd>{s.guardian_phone || "—"}</dd>
            <dt>Email</dt><dd>{s.guardian_email || "—"}</dd>
            <dt>Address</dt><dd>{s.address || "—"}</dd>
            <dt>Medical notes</dt><dd>{s.medical_notes || "—"}</dd>
          </dl>
        </section>
      )}

      {thisWeek && thisWeek.length > 0 && (
        <section className="card">
          <h2>Learning this week in {arm?.label}</h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            {thisWeek.map((t: any) => <li key={t.id}><b>{t.subjects?.name}:</b> {t.topic}</li>)}
          </ul>
        </section>
      )}

      {isAdmin && (
        <section className="card">
          <h2>Parent accounts</h2>
          <p className="small muted">Linked parents can see this child's profile and class work when they sign in. Parents must first join the school with the school code.</p>
          {(links || []).length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 8 }}>
              {(links || []).map((l: any) => (
                <li key={l.parent_id} className="row" style={{ justifyContent: "space-between" }}>
                  <span>{parentName.get(l.parent_id) || "Parent"}{l.relationship ? ` · ${l.relationship}` : ""}</span>
                  <form action={unlinkParent}>
                    <input type="hidden" name="student_id" value={id} />
                    <input type="hidden" name="parent_id" value={l.parent_id} />
                    <button className="btn warn small">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <p className="muted small">No parent account linked yet.</p>}
          {(parents || []).filter((p: any) => !linked.has(p.id)).length > 0 ? (
            <form action={linkParent} className="row">
              <input type="hidden" name="student_id" value={id} />
              <label className="field" htmlFor="lp-parent">Parent account
                <select id="lp-parent" name="parent_id" required>
                  {(parents || []).filter((p: any) => !linked.has(p.id)).map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </label>
              <label className="field" htmlFor="lp-rel">Relationship
                <select id="lp-rel" name="relationship" defaultValue="Parent">
                  <option>Parent</option><option>Mother</option><option>Father</option><option>Guardian</option>
                </select>
              </label>
              <button className="btn ghost">Link parent</button>
            </form>
          ) : <p className="small muted">No other parent accounts in your school yet.</p>}
        </section>
      )}

      <section className="card">
        <h2>Results, attendance and fees</h2>
        <p className="muted small">Coming in the next update: term results and report cards, daily attendance, and fee payments for this student.</p>
      </section>
    </main>
  );
}
