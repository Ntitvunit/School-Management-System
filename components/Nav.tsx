import Link from "next/link";
import { getContext } from "@/lib/context";

const LINKS: Record<string, [string, string][]> = {
  admin: [["/", "Home"], ["/students", "Students"], ["/results", "Results"], ["/attendance", "Attendance"], ["/scheme", "Scheme of work"],
          ["/notes", "Lesson notes"], ["/finance", "Finance"], ["/announcements", "News"], ["/settings", "Settings"]],
  teacher: [["/", "Home"], ["/students", "Students"], ["/results", "Results"], ["/attendance", "Attendance"], ["/scheme", "Scheme of work"],
            ["/notes", "Lesson notes"], ["/announcements", "News"]],
  bursar: [["/", "Home"], ["/finance", "Finance"], ["/finance/pay", "Record payment"], ["/students", "Students"], ["/announcements", "News"]],
  parent: [["/", "Home"], ["/children", "My children"], ["/this-week", "This week"], ["/announcements", "News"]],
  student: [["/my", "My results"], ["/this-week", "This week"], ["/announcements", "News"]],
};

export default async function Nav() {
  const { user, profile, school, isPlatformAdmin } = await getContext();
  if (!user) return null;
  const role = profile?.role;
  const active = school && school.status === "active";
  const links = active && role ? LINKS[role] || [] : [];
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          {school?.name || "School Management System"}
          <small>{school?.motto || "School Management System"}</small>
        </Link>
        <nav className="nav" aria-label="Main">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          {isPlatformAdmin && <Link href="/platform" className="platform-link">Platform owner</Link>}
        </nav>
        <div className="who">
          <span>{profile?.full_name || user.email}{role ? ` · ${role}` : ""}</span>
          <form action="/auth/signout" method="post">
            <button className="btn on-band small" type="submit">Sign out</button>
          </form>
        </div>
      </div>
      <div className="band-stripe" aria-hidden="true" />
    </header>
  );
}
