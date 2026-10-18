import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { loadArms } from "@/lib/arms";
import { termLedger } from "@/lib/finance";
import { naira } from "@/lib/money";
import AutoSelect from "@/components/AutoSelect";

export default async function Finance({ searchParams }: { searchParams: Promise<{ arm?: string; show?: string }> }) {
  const sp = await searchParams;
  const { supabase, school } = await requireMember(["admin", "bursar"]);
  const arms = await loadArms(supabase, school.id, school);
  const ledger = await termLedger(supabase, school, arms);
  const { data: recent } = await supabase.from("payments").select("id, receipt_no, amount, method, paid_on, student_id")
    .eq("school_id", school.id).order("created_at", { ascending: false }).limit(8);
  const nameOf = new Map(ledger.map((s: any) => [s.id, `${s.last_name}, ${s.first_name}`]));
  const billed = ledger.reduce((a, s) => a + s.billed - s.discount, 0);
  const paid = ledger.reduce((a, s) => a + s.paid, 0);
  const owing = ledger.filter((s) => s.balance > 0);
  const outstanding = owing.reduce((a, s) => a + s.balance, 0);
  const pct = billed > 0 ? Math.round((100 * paid) / billed) : 0;
  const show = sp.show === "all" ? ledger : owing;
  const rows = show.filter((s) => !sp.arm || s.armId === sp.arm).sort((a, b) => b.balance - a.balance);

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Finance (bursary)</h1>
          <p className="muted small">{school.current_session} · {TERM_NAMES[school.current_term]} term</p>
        </div>
        <div className="row">
          <Link className="btn" href="/finance/pay">Record a payment</Link>
          <Link className="btn ghost" href="/finance/fees">Fee structure</Link>
        </div>
      </div>
      <section className="stats">
        <div className="stat"><div className="n">{naira(billed)}</div><div className="l">Expected (after discounts)</div></div>
        <div className="stat"><div className="n">{naira(paid)}</div><div className="l">Collected · {pct}%</div></div>
        <div className="stat"><div className="n">{naira(outstanding)}</div><div className="l">Outstanding</div></div>
        <div className="stat"><div className="n">{owing.length}</div><div className="l">Students owing</div></div>
      </section>
      <div className="track" role="img" aria-label={`${pct}% of fees collected`} style={{ height: 16 }}><div className="fill" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      <form className="card row" method="get" action="/finance">
        <label className="field" htmlFor="f-arm">Class
          <AutoSelect id="f-arm" name="arm" defaultValue={sp.arm || ""}>
            <option value="">All classes</option>{arms.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </AutoSelect>
        </label>
        <label className="field" htmlFor="f-show">Show
          <AutoSelect id="f-show" name="show" defaultValue={sp.show || "owing"}>
            <option value="owing">Debtors only</option><option value="all">All students</option>
          </AutoSelect>
        </label>
      </form>
      <div className="card table-wrap">
        <h2>{sp.show === "all" ? "All students" : "Debtors list"}</h2>
        {!rows.length ? <p className="muted">{sp.show === "all" ? "No students." : "No one is owing for this term."}</p> : (
          <table className="list">
            <thead><tr><th>Student</th><th>Class</th><th>Billed</th><th>Discount</th><th>Paid</th><th>Balance</th><th>Guardian phone</th><th></th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/students/${s.id}`}><b>{s.last_name}, {s.first_name}</b></Link><div className="small muted">{s.admission_no}</div></td>
                  <td>{s.classLabel}</td><td>{naira(s.billed)}</td><td>{s.discount ? naira(s.discount) : "—"}</td><td>{naira(s.paid)}</td>
                  <td><b className={s.balance > 0 ? "behind" : ""}>{naira(s.balance)}</b></td>
                  <td>{s.guardian_phone || "—"}</td>
                  <td><Link className="btn small ghost" href={`/finance/pay?student=${s.id}`}>Pay</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card table-wrap">
        <h2>Recent payments</h2>
        {!recent?.length ? <p className="muted">No payments recorded yet.</p> : (
          <table className="list">
            <thead><tr><th>Receipt</th><th>Student</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
            <tbody>
              {recent.map((p: any) => (
                <tr key={p.id}>
                  <td><Link href={`/finance/receipt/${p.id}`}>#{String(p.receipt_no).padStart(6, "0")}</Link></td>
                  <td>{nameOf.get(p.student_id) || "—"}</td><td>{naira(p.amount)}</td>
                  <td style={{ textTransform: "capitalize" }}>{p.method}</td><td>{new Date(p.paid_on).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
