import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { loadArms } from "@/lib/arms";
import { termLedger } from "@/lib/finance";
import PaymentForm from "@/components/PaymentForm";
import { recordPayment } from "../actions";

export default async function Pay({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const sp = await searchParams;
  const { supabase, school } = await requireMember(["admin", "bursar"]);
  const arms = await loadArms(supabase, school.id, school);
  const ledger = (await termLedger(supabase, school, arms)).sort((a, b) => a.last_name.localeCompare(b.last_name));
  const today = new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 10);
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <div>
        <Link href="/finance" className="small">← Finance</Link>
        <h1>Record a payment</h1>
        <p className="muted small">{school.current_session} · {TERM_NAMES[school.current_term]} term</p>
      </div>
      <PaymentForm action={recordPayment} term={school.current_term} today={today} initialStudent={sp.student}
        students={ledger.map((s) => ({ id: s.id, label: `${s.last_name}, ${s.first_name} (${s.admission_no}, ${s.classLabel})`, balance: s.balance }))} />
    </main>
  );
}
