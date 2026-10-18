import Link from "next/link";
import { requireMember } from "@/lib/session";
import { loadArms } from "@/lib/arms";
import StudentForm from "@/components/StudentForm";
import { createStudent } from "../actions";

export default async function NewStudent() {
  const { supabase, school } = await requireMember(["admin"]);
  const arms = await loadArms(supabase, school.id, school);
  return (
    <main className="page" style={{ maxWidth: 900 }}>
      <div>
        <Link href="/students" className="small">← All students</Link>
        <h1>Admit a student</h1>
      </div>
      <StudentForm action={createStudent} arms={arms.map((a: any) => ({ id: a.id, label: a.label }))} submitLabel="Save student" />
    </main>
  );
}
