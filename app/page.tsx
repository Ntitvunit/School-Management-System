import Link from "next/link";
import Icon from "@/components/Icon";
import { requireMember, TERM_NAMES } from "@/lib/session";

export default async function Home() {
  const { supabase, profile, school } = await requireMember();
  const role = profile.role;
  const first = (profile.full_name || "").split(" ")[0] || "there";

  let stats: { n: number | string; l: string }[] = [];
  if (role !== "parent") {
    const [students, staff, awaiting, mine] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("status", "active"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", school.id).in("role", ["admin", "teacher"]),
      supabase.from("lesson_notes").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("status", "submitted"),
      supabase.from("lesson_notes").select("id", { count: "exact", head: true }).eq("teacher_id", profile.id).eq("session", school.current_session),
    ]);
    stats = [
      { n: students.count ?? 0, l: "Active students" },
      { n: staff.count ?? 0, l: "Staff" },
      role === "admin" ? { n: awaiting.count ?? 0, l: "Notes awaiting review" } : { n: mine.count ?? 0, l: "My lesson notes" },
      { n: `${TERM_NAMES[school.current_term]} · Wk ${school.current_week}`, l: school.current_session },
    ];
  }

  const tiles = [
    { href: "/scheme", icon: "book", title: "Scheme of work", text: "Weekly topics for every class and subject", show: role !== "parent" },
    { href: "/notes", icon: "note", title: "Lesson notes", text: role === "admin" ? "Review and approve notes" : "Write and submit your notes", show: role !== "parent" },
    { href: "/students", icon: "users", title: "Students", text: role === "admin" ? "Admit, edit and link parents" : "Student records by class", show: role !== "parent" },
    { href: "/children", icon: "child", title: "My children", text: "Profiles and class details", show: role === "parent" },
    { href: "/this-week", icon: "calendar", title: "This week", text: "What each class is learning", show: true },
    { href: "/coverage", icon: "chart", title: "Coverage", text: "Topics covered against the calendar", show: role === "admin" },
    { href: "/settings", icon: "palette", title: "Settings & theme", text: "Calendar, colours, classes, school code", show: role === "admin" },
  ].filter((t) => t.show);

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
    </main>
  );
}
