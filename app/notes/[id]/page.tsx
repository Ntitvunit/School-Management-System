import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { deleteNote, reviewNote, saveNote } from "./actions";

const SAVED: Record<string, string> = {
  save: "Draft saved.", submit: "Submitted for review.", approved: "Lesson note approved.", returned: "Returned to the teacher with your comment.",
};

export default async function NotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile } = await requireMember(["admin", "teacher"]);
  const { data: n } = await supabase.from("lesson_notes")
    .select("*, curriculum_topics(topic, term, week, subjects(name)), class_arms(arm, class_levels(name))")
    .eq("id", id).maybeSingle();
  if (!n) notFound();
  const { data: teacher } = await supabase.from("profiles").select("full_name").eq("id", n.teacher_id).maybeSingle();
  const mine = n.teacher_id === profile.id;
  const editable = mine && (n.status === "draft" || n.status === "returned");
  const canReview = profile.role === "admin" && n.status === "submitted";
  const t: any = n.curriculum_topics;

  return (
    <main className="page" style={{ maxWidth: 900 }}>
      <div>
        <Link href="/notes" className="small">← All lesson notes</Link>
        <div className="eyebrow" style={{ marginTop: 8 }}>
          {n.class_arms?.class_levels?.name} {n.class_arms?.arm} · {t?.subjects?.name} · {TERM_NAMES[t?.term]} term · Week {t?.week}
        </div>
        <h1>{t?.topic}</h1>
        <div className="row small muted" style={{ marginTop: 6 }}>
          <span className={`chip ${n.status}`}>{n.status === "submitted" ? "Awaiting review" : n.status}</span>
          <span>Teacher: {teacher?.full_name || "—"}</span>
        </div>
      </div>
      {sp.saved && SAVED[sp.saved] && <div className="notice">{SAVED[sp.saved]}</div>}
      {n.review_comment && (n.status === "returned" || n.status === "approved") && (
        <div className={n.status === "returned" ? "error" : "notice"}><b>Reviewer's comment:</b> {n.review_comment}</div>
      )}

      {editable ? (
        <form action={saveNote} className="card">
          <input type="hidden" name="id" value={n.id} />
          <label className="field" htmlFor="note-text">Lesson note (pre-filled from the scheme of work — edit freely)
            <textarea id="note-text" name="text" defaultValue={n.content?.text || ""} />
          </label>
          <div className="row">
            <button className="btn ghost" name="intent" value="save">Save draft</button>
            <button className="btn" name="intent" value="submit">Submit for review</button>
          </div>
        </form>
      ) : (
        <div className="card"><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{n.content?.text}</pre></div>
      )}

      {editable && n.status === "draft" && (
        <form action={deleteNote}>
          <input type="hidden" name="id" value={n.id} />
          <button className="btn warn small">Delete this draft</button>
        </form>
      )}

      {canReview && (
        <form action={reviewNote} className="card">
          <h2>Review</h2>
          <input type="hidden" name="id" value={n.id} />
          <label className="field" htmlFor="comment">Comment for the teacher
            <input id="comment" name="comment" placeholder="e.g. Add an evaluation question" />
          </label>
          <div className="row">
            <button className="btn" name="decision" value="approve">Approve</button>
            <button className="btn warn" name="decision" value="return">Return for correction</button>
          </div>
        </form>
      )}
    </main>
  );
}
