import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";

type Search = { status?: string };

export default async function NotesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember(["admin", "teacher"]);
  let q = supabase.from("lesson_notes")
    .select("id, status, submitted_at, updated_at, teacher_id, topic_id, class_arm_id, curriculum_topics(topic, term, week, subject_id, subjects(name)), class_arms(arm, class_levels(name))")
    .eq("school_id", school.id).eq("session", school.current_session)
    .order("updated_at", { ascending: false });
  if (sp.status) q = q.eq("status", sp.status);
  const { data: notes, error } = await q;

  const { data: people } = await supabase.from("profiles").select("id, full_name").eq("school_id", school.id);
  const nameOf = new Map((people || []).map((p: any) => [p.id, p.full_name]));
  const isAdmin = profile.role === "admin";
  const filters = [["", "All"], ["draft", "Drafts"], ["submitted", "Awaiting review"], ["approved", "Approved"], ["returned", "Returned"]];

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Lesson notes</h1>
          <p className="muted small">{isAdmin ? "All lesson notes in your school. Open a submitted note to approve or return it." : "Your lesson notes. Start a new one from the Scheme of work page."}</p>
        </div>
        <div className="row">
          {filters.map(([v, l]) => (
            <Link key={v} href={v ? `/notes?status=${v}` : "/notes"} className={`btn small ${(sp.status || "") === v ? "" : "ghost"}`}>{l}</Link>
          ))}
        </div>
      </div>
      {error && <div className="error">{error.message}</div>}
      <div className="card table-wrap">
        {!notes?.length ? (
          <p className="muted">No lesson notes yet. Go to <Link href="/scheme">Scheme of work</Link>, open a week and click “Start lesson note”.</p>
        ) : (
          <table className="list">
            <thead><tr><th>Topic</th><th>Class</th><th>Subject</th><th>Term / week</th>{isAdmin && <th>Teacher</th>}<th>Status</th></tr></thead>
            <tbody>
              {notes.map((n: any) => (
                <tr key={n.id}>
                  <td><Link href={`/notes/${n.id}`}><b>{n.curriculum_topics?.topic}</b></Link></td>
                  <td>{n.class_arms?.class_levels?.name} {n.class_arms?.arm}</td>
                  <td>{n.curriculum_topics?.subjects?.name}</td>
                  <td>{TERM_NAMES[n.curriculum_topics?.term]} · Wk {n.curriculum_topics?.week}</td>
                  {isAdmin && <td>{nameOf.get(n.teacher_id) || "—"}</td>}
                  <td><span className={`chip ${n.status}`}>{n.status === "submitted" ? "Awaiting review" : n.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
