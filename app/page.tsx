import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/Icon";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { naira } from "@/lib/money";

export default async function Home() {
  const { supabase, profile, school } = await requireMember();
  const role = profile.role;
  if (role === "student") redirect("/my");
  const first = (profile.full_name || "").split(" ")[0] || "there";
  const count = (q: any) => q.then((r: any) => r.count ?? 0);

  let stats: { n: number | string; l: string }[] = [];
  if (role === "admin" || role === "teacher") {
    const [students, staff, awaiting, mine] = await Promise.all([
      count(supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("status", "active")),
      count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", school.id).in("role", ["admin", "teacher", "bursar"])),
      count(supabase.from("lesson_notes").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("status", "submitted")),
      count(supabase.from("lesson_notes").select("id", { count: "exact", head: true }).eq("teacher_id", profile.id).eq("session", school.current_session)),
    ]);
    stats = [
      { n: students, l: "Active students" }, { n: staff, l: "Staff" },
      role === "admin" ? { n: awaiting, l: "Notes awaiting review" } : { n: mine, l: "My lesson notes" },
      { n: `${TERM_NAMES[school.current_term]} · Wk ${school.current_week}`, l: school.current_session },
    ];
  } else if (role === "bursar") {
    const { data: pays } = await supabase.from("payments").select("amount").eq("school_id", school.id).eq("session", school.current_session).eq("term", school.current_term);
    stats = [
      { n: naira((pays || []).reduce((a: number, p: any) => a + Number(p.amount), 0)), l: "Collected this term" },
      { n: (pays || []).length, l: "Payments this term" },
      { n: `${TERM_NAMES[school.current_term]} term`, l: school.current_session },
    ];
  }

  const T = (href: string, icon: string, title: string, text: string) => ({ href, icon, title, text });
  const tiles = ({
    admin: [T("/students", "users", "Students", "Admit, edit and link parents"), T("/results", "chart", "Results", "Scores, broadsheets, report cards"),
            T("/attendance", "calendar", "Attendance", "Daily class registers"), T("/finance", "note", "Finance", "Fees, payments and debtors"),
            T("/scheme", "book", "Scheme of work", "Weekly topics for every class"), T("/notes", "note", "Lesson notes", "Review and approve notes"),
            T("/coverage", "chart", "Coverage", "Topics covered against the calendar"), T("/staff", "users", "Staff and roles", "Roles, class and subject teachers"),
            T("/announcements", "calendar", "Announcements", "Notices to staff, parents, students"), T("/settings", "palette", "Settings and theme", "Levels, grading, colours, subjects")],
    teacher: [T("/results", "chart", "Enter scores", "Your subjects and classes"), T("/attendance", "calendar", "Attendance", "Mark today's register"),
              T("/scheme", "book", "Scheme of work", "This week's topics"), T("/notes", "note", "Lesson notes", "Write and submit"),
              T("/results/remarks", "note", "Report comments", "Comments and ratings"), T("/students", "users", "Students", "Student records")],
    bursar: [T("/finance/pay", "note", "Record a payment", "Issue a receipt"), T("/finance", "chart", "Debtors", "Who is owing this term"),
             T("/finance/fees", "book", "Fee structure", "Fees per class and term"), T("/students", "users", "Students", "Student records")],
    parent: [T("/children", "child", "My children", "Results, attendance and fees"), T("/this-week", "calendar", "This week", "What each class is learning"),
             T("/announcements", "note", "Announcements", "News from the school")],
  } as Record<string, any[]>)[role] || [];

  const { data: news } = await supabase.from("announcements").select("id, title, created_at").eq("school_id", school.id).order("created_at", { ascending: false }).limit(3);

  return (
    <main className="page">
      <div className="hello">
        <h1>Welcome, {first}</h1>
        <p className="muted">{school.name} · {school.current_session} · {TERM_NAMES[school.current_term]} term, week {school.current_week}</p>
      </div>
      {stats.length > 0 && (
        <section className="stats" aria-label="Summary">
          {stats.map((s) => <div key={s.l} className="stat"><div className="n">{s.n}</div><div className="l">{s.l}</div></div>)}
        </section>
      )}
      <section className="tiles" aria-label="Sections">
        {tiles.map((t, i) => (
          <Link key={t.href} href={t.href} className={`tile ${i % 2 ? "alt" : ""} ${Math.floor(i / 2) % 2 ? "soft" : ""}`}>
            <div className="ic"><Icon name={t.icon} /></div>
            <b>{t.title}</b>
            <span>{t.text}</span>
          </Link>
        ))}
      </section>
      {news && news.length > 0 && (
        <section className="card">
          <div className="row" style={{ justifyContent: "space-between" }}><h2>Latest news</h2><Link className="small" href="/announcements">All announcements</Link></div>
          {news.map((a: any) => <div key={a.id}><b>{a.title}</b> <span className="small muted">· {new Date(a.created_at).toLocaleDateString("en-GB")}</span></div>)}
        </section>
      )}
    </main>
  );
}
