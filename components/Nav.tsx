import Link from "next/link";
import { getContext } from "@/lib/context";

export default async function Nav() {
  const { user, profile, school, isPlatformAdmin } = await getContext();
  if (!user) return null;
  const role = profile?.role;
  const active = school && school.status === "active";
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          {school?.name || "School Management System"}
          <small>{school?.motto || "School Management System"}</small>
        </Link>
        <nav className="nav" aria-label="Main">
          {active && <Link href="/">Home</Link>}
          {active && role !== "parent" && <Link href="/scheme">Scheme of work</Link>}
          {active && role !== "parent" && <Link href="/notes">Lesson notes</Link>}
          {active && role !== "parent" && <Link href="/students">Students</Link>}
          {active && role === "parent" && <Link href="/children">My children</Link>}
          {active && role === "admin" && <Link href="/coverage">Coverage</Link>}
          {active && <Link href="/this-week">This week</Link>}
          {active && role === "admin" && <Link href="/settings">Settings</Link>}
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
