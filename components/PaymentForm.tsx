"use client";
import { useActionState, useMemo, useState } from "react";

type Row = { id: string; label: string; balance: number };

export default function PaymentForm({ action, students, initialStudent, term, today }: {
  action: (s: any, f: FormData) => Promise<any>;
  students: Row[];
  initialStudent?: string;
  term: number;
  today: string;
}) {
  const [state, formAction, pending] = useActionState(action, null as any);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(initialStudent || "");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? students.filter((s) => s.label.toLowerCase().includes(t)) : students;
  }, [q, students]);
  const chosen = students.find((s) => s.id === sel);
  const fmt = (n: number) => "₦" + n.toLocaleString("en-NG");
  return (
    <form action={formAction} className="card">
      <input type="hidden" name="term" value={term} />
      <label className="field" htmlFor="pf-q">Find student (name, admission no. or class)
        <input id="pf-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search" />
      </label>
      <label className="field" htmlFor="pf-student">Student
        <select id="pf-student" name="student_id" required value={sel} onChange={(e) => setSel(e.target.value)} size={Math.min(8, Math.max(3, shown.length))}>
          {shown.map((s) => <option key={s.id} value={s.id}>{s.label} · balance {fmt(s.balance)}</option>)}
        </select>
      </label>
      {chosen && <div className={chosen.balance > 0 ? "error" : "notice"}>Balance this term: <b>{fmt(chosen.balance)}</b></div>}
      <div className="grid2">
        <label className="field" htmlFor="pf-amt">Amount paid (₦)
          <input id="pf-amt" name="amount" required inputMode="decimal" defaultValue={chosen && chosen.balance > 0 ? String(chosen.balance) : ""} key={sel} />
        </label>
        <label className="field" htmlFor="pf-method">Method
          <select id="pf-method" name="method" defaultValue="transfer">
            <option value="transfer">Bank transfer</option><option value="cash">Cash</option><option value="pos">POS</option>
            <option value="online">Online</option><option value="cheque">Cheque</option>
          </select>
        </label>
        <label className="field" htmlFor="pf-ref">Reference / teller no.<input id="pf-ref" name="reference" /></label>
        <label className="field" htmlFor="pf-date">Date paid<input id="pf-date" type="date" name="paid_on" defaultValue={today} /></label>
      </div>
      <label className="field" htmlFor="pf-note">Note<input id="pf-note" name="note" placeholder="optional" /></label>
      {state?.error && <div className="error">{state.error}</div>}
      <div><button className="btn" disabled={pending}>{pending ? "Saving…" : "Save and print receipt"}</button></div>
    </form>
  );
}
