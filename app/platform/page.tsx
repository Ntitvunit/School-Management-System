import { redirect } from "next/navigation";
import { getContext } from "@/lib/context";
import { setSchoolStatus } from "./actions";

export default async function Platform() {
  const { supabase, user, isPlatformAdmin } = await getContext();
  if (!user) redirect("/login");
  if (!isPlatformAdmin) redirect("/");
  const { data: schools, error } = await supabase.rpc("platform_overview");
  const rows = (schools || []) as any[];
  const total = (k: string) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);
  return (
    <main className="page">
      <div>
        <div className="eyebrow">Platform owner</div>
        <h1>All schools</h1>
        <p className="muted small">Only you can see this page. It shows counts only; pupils' personal details stay private to each school.</p>
      </div>
      {error && <div className="error">{error.message}</div>}
      <section className="stats">
        <div className="stat"><div className="n">{rows.length}</div><div className="l">Schools</div></div>
        <div className="stat"><div className="n">{rows.filter((r) => r.status === "active").length}</div><div className="l">Active</div></div>
        <div className="stat"><div className="n">{total("teachers")}</div><div className="l">Teachers</div></div>
        <div className="stat"><div className="n">{total("students")}</div><div className="l">Students</div></div>
        <div className="stat"><div className="n">{total("parents")}</div><div className="l">Parents</div></div>
      </section>
      <div className="card table-wrap">
        <table className="list">
          <thead><tr><th>School</th><th>Admin</th><th>Joined</th><th>Teachers</th><th>Parents</th><th>Students</th><th>Lesson notes</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <td>{r.admin_name || "—"}</td>
                <td>{new Date(r.created_at).toLocaleDateString("en-GB")}</td>
                <td>{r.teachers}</td><td>{r.parents}</td><td>{r.students}</td><td>{r.lesson_notes}</td>
                <td><span className={`chip ${r.status === "active" ? "approved" : "returned"}`}>{r.status}</span></td>
                <td>
                  <form action={setSchoolStatus}>
                    <input type="hidden" name="school_id" value={r.id} />
                    <input type="hidden" name="status" value={r.status === "active" ? "suspended" : "active"} />
                    <button className={`btn small ${r.status === "active" ? "warn" : ""}`}>{r.status === "active" ? "Suspend" : "Reactivate"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
