import { requireMember } from "@/lib/session";
import { deleteAnnouncement, postAnnouncement } from "./actions";

const AUD: Record<string, string> = { everyone: "Everyone", staff: "Staff", parents: "Parents", students: "Students" };

export default async function Announcements({ searchParams }: { searchParams: Promise<{ posted?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember();
  const { data: items } = await supabase.from("announcements").select("*").eq("school_id", school.id).order("created_at", { ascending: false }).limit(100);
  const isAdmin = profile.role === "admin";
  return (
    <main className="page" style={{ maxWidth: 860 }}>
      <h1>Announcements</h1>
      {sp.posted && <div className="notice">Announcement posted.</div>}
      {isAdmin && (
        <form className="card" action={postAnnouncement}>
          <h2>Post an announcement</h2>
          <label className="field" htmlFor="an-title">Title<input id="an-title" name="title" required placeholder="e.g. Mid-term break: 27 to 31 October" /></label>
          <label className="field" htmlFor="an-body">Message<textarea id="an-body" name="body" style={{ minHeight: 110 }} /></label>
          <div className="row">
            <label className="field" htmlFor="an-aud">Who sees it
              <select id="an-aud" name="audience" defaultValue="everyone">{Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <button className="btn">Post</button>
          </div>
        </form>
      )}
      {!items?.length ? <div className="card muted">No announcements yet.</div> : items.map((a: any) => (
        <article key={a.id} className="card" style={{ borderLeft: "5px solid var(--mark)" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="eyebrow">{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {AUD[a.audience]}</div>
              <h2>{a.title}</h2>
            </div>
            {isAdmin && <form action={deleteAnnouncement}><input type="hidden" name="id" value={a.id} /><button className="btn warn small">Delete</button></form>}
          </div>
          {a.body && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{a.body}</p>}
        </article>
      ))}
    </main>
  );
}
