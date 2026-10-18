import { requireMember, TERM_NAMES } from "@/lib/session";

export default async function ScoreLog() {
  const { supabase, school } = await requireMember(["admin"]);
  const { data: rows } = await supabase.from("score_audit").select("*").eq("school_id", school.id).order("changed_at", { ascending: false }).limit(300);
  const sids = [...new Set((rows || []).map((r: any) => r.student_id).filter(Boolean))];
  const uids = [...new Set((rows || []).map((r: any) => r.changed_by).filter(Boolean))];
  const subs = [...new Set((rows || []).map((r: any) => r.subject_id).filter(Boolean))];
  const [{ data: st }, { data: pp }, { data: sb }] = await Promise.all([
    sids.length ? supabase.from("students").select("id, first_name, last_name").in("id", sids) : Promise.resolve({ data: [] as any[] }),
    uids.length ? supabase.from("profiles").select("id, full_name").in("id", uids) : Promise.resolve({ data: [] as any[] }),
    subs.length ? supabase.from("subjects").select("id, name").in("id", subs) : Promise.resolve({ data: [] as any[] }),
  ]);
  const sName = new Map((st || []).map((s: any) => [s.id, `${s.last_name}, ${s.first_name}`]));
  const pName = new Map((pp || []).map((p: any) => [p.id, p.full_name]));
  const subName = new Map((sb || []).map((s: any) => [s.id, s.name]));
  return (
    <main className="page">
      <div>
        <h1>Score change log</h1>
        <p className="muted small">Every change to a score after it was first entered, with who changed it and when. Entries cannot be edited or deleted from the app.</p>
      </div>
      <div className="card table-wrap">
        {!rows?.length ? <p className="muted">No changes recorded yet.</p> : (
          <table className="list">
            <thead><tr><th>When</th><th>Student</th><th>Subject</th><th>Term</th><th>Change</th><th>By</th></tr></thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td className="small">{new Date(r.changed_at).toLocaleString("en-GB")}</td>
                  <td>{sName.get(r.student_id) || "—"}</td>
                  <td>{subName.get(r.subject_id) || r.subject_id}</td>
                  <td>{TERM_NAMES[r.term]} · {r.session}</td>
                  <td>{r.action === "deleted" ? <span className="behind">Deleted ({r.old_total})</span> : <><b>{r.old_total ?? "—"}</b> → <b>{r.new_total ?? "—"}</b></>}</td>
                  <td>{pName.get(r.changed_by) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
