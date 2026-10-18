import Link from "next/link";
import { requireMember } from "@/lib/session";
import { loadArms } from "@/lib/arms";

export default async function Children() {
  const { supabase, school } = await requireMember(["parent"]);
  const { data: kids } = await supabase.from("students").select("id, first_name, last_name, admission_no, gender, class_arm_id").order("first_name");
  const arms = await loadArms(supabase, school.id, school);
  const label = new Map(arms.map((a: any) => [a.id, a.label]));
  return (
    <main className="page" style={{ maxWidth: 900 }}>
      <h1>My children</h1>
      {!kids?.length ? (
        <div className="card">
          <p>No children are linked to your account yet.</p>
          <p className="muted small">Ask the school admin to link your account to your child's record.</p>
        </div>
      ) : (
        <section className="tiles">
          {kids.map((k: any, i: number) => (
            <Link key={k.id} href={`/children/${k.id}`} className={`tile ${i % 2 ? "alt" : ""}`}>
              <div className="ic"><b style={{ fontSize: 15 }}>{(k.first_name[0] || "") + (k.last_name[0] || "")}</b></div>
              <b>{k.first_name} {k.last_name}</b>
              <span>{label.get(k.class_arm_id) || "Class not set"} · {k.admission_no}</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
