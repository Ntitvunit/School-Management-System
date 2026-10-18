import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { naira } from "@/lib/money";
import PrintButton from "@/components/PrintButton";

export default async function Receipt({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, school } = await requireMember(["admin", "bursar"]);
  const { data: p } = await supabase.from("payments").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: st }, { data: by }, { data: ov }] = await Promise.all([
    supabase.from("students").select("first_name, last_name, admission_no").eq("id", p.student_id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", p.received_by).maybeSingle(),
    supabase.rpc("get_child_overview", { p_student: p.student_id }),
  ]);
  const fees = ov?.fees;
  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <div className="row no-print" style={{ justifyContent: "space-between" }}>
        <Link href="/finance" className="small">← Finance</Link>
        <div className="row"><Link className="btn ghost small" href="/finance/pay">Record another</Link><PrintButton label="Print receipt" /></div>
      </div>
      {sp.new && <div className="notice no-print">Payment saved.</div>}
      <article className="report">
        <header className="report-head">
          <div>
            <h1>{school.name}</h1>
            {(school as any).address && <div className="small muted">{(school as any).address}</div>}
          </div>
          <div className="report-title">Receipt<br /><span>#{String(p.receipt_no).padStart(6, "0")}</span></div>
        </header>
        <dl className="kv">
          <dt>Received from</dt><dd><b>{st ? `${st.first_name} ${st.last_name}` : "—"}</b> ({st?.admission_no})</dd>
          <dt>Amount</dt><dd><b style={{ fontSize: 22 }}>{naira(p.amount)}</b></dd>
          <dt>For</dt><dd>School fees · {TERM_NAMES[p.term]} term {p.session}</dd>
          <dt>Method</dt><dd style={{ textTransform: "capitalize" }}>{p.method}{p.reference ? ` · Ref ${p.reference}` : ""}</dd>
          <dt>Date</dt><dd>{new Date(p.paid_on).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
          {p.note && <><dt>Note</dt><dd>{p.note}</dd></>}
          <dt>Received by</dt><dd>{by?.full_name || "—"}</dd>
          {fees && p.session === school.current_session && p.term === school.current_term && <><dt>Balance after payments</dt><dd><b>{naira(fees.balance)}</b></dd></>}
        </dl>
        <p className="small muted">Thank you. Please keep this receipt.</p>
      </article>
    </main>
  );
}
