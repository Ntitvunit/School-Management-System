import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name, role, school_id").eq("id", user.id).maybeSingle();
  let schoolName = "";
  if (profile?.school_id) {
    const { data: school } = await supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle();
    schoolName = school?.name ?? "";
  }
  const role = profile?.role;
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          {schoolName || "School Management System"}
          <small>School Management System</small>
        </Link>
        {profile?.school_id && (
          <nav className="nav" aria-label="Main">
            {role !== "parent" && <Link href="/scheme">Scheme of work</Link>}
            {role !== "parent" && <Link href="/notes">Lesson notes</Link>}
            {role === "admin" && <Link href="/coverage">Coverage</Link>}
            <Link href="/this-week">This week</Link>
            {role === "admin" && <Link href="/settings">School settings</Link>}
          </nav>
        )}
        <div className="who">
          <span>{profile?.full_name || user.email}{role ? ` · ${role}` : ""}</span>
          <form action="/auth/signout" method="post">
            <button className="btn ghost small" type="submit">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
