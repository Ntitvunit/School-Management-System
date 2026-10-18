import Link from "next/link";
import { TERM_NAMES } from "@/lib/terms";
import { naira } from "@/lib/money";
import { ordinal } from "@/lib/grading";

/** Parent / student view of one child: alerts, attendance, results, fees. */
export default function ChildOverview({ data, thisWeek, announcements }: { data: any; thisWeek?: any[]; announcements?: any[] }) {
  const st = data.student;
  const att = data.attendance || {};
  const fees = data.fees || {};
  const published = (data.results || []).filter((r: any) => r.published && r.average !== null);
  const last = published[published.length - 1], prev = published[published.length - 2];
  const drop = last && prev ? Number(prev.average) - Number(last.average) : 0;
  const rate = att.total ? Math.round((100 * att.present) / att.total) : null;
  return (
    <>
      <div>
        <div className="eyebrow">{st.admission_no} · {st.class || "Class not set"}</div>
        <h1>{st.name}</h1>
        <p className="muted small">{data.session} · {TERM_NAMES[data.term]} term</p>
      </div>
      {drop >= 5 && (
        <div className="error"><b>Attention:</b> {st.name.split(" ")[0]}'s average fell from {Number(prev.average).toFixed(1)} ({TERM_NAMES[prev.term]} term) to {Number(last.average).toFixed(1)} ({TERM_NAMES[last.term]} term). Consider speaking with the class teacher.</div>
      )}
      {last && prev && drop <= -5 && (
        <div className="notice"><b>Well done:</b> average rose from {Number(prev.average).toFixed(1)} to {Number(last.average).toFixed(1)}.</div>
      )}
      <section className="stats">
        <div className="stat"><div className="n">{rate === null ? "—" : `${rate}%`}</div><div className="l">Attendance this term</div></div>
        <div className="stat"><div className="n">{att.absent ?? 0}</div><div className="l">Days absent</div></div>
        <div className="stat"><div className="n">{last ? Number(last.average).toFixed(1) : "—"}</div><div className="l">Latest average</div></div>
        <div className="stat"><div className="n">{naira(fees.balance)}</div><div className="l">Fees balance</div></div>
      </section>
      <div className="grid2">
        <section className="card">
          <h2>Results</h2>
          {!(data.results || []).length ? <p className="muted small">No results yet.</p> : (
            <table className="list"><tbody>
              {(data.results || []).slice().reverse().map((r: any) => (
                <tr key={r.session + r.term}>
                  <td>{TERM_NAMES[r.term]} term {r.session}</td>
                  <td>{r.published ? <>Average <b>{r.average !== null ? Number(r.average).toFixed(1) : "—"}</b></> : <span className="muted">Not released yet</span>}</td>
                  <td>{r.published && <Link href={`/results/report/${st.id}?term=${r.term}&session=${encodeURIComponent(r.session)}`}>Report card</Link>}</td>
                </tr>
              ))}
            </tbody></table>
          )}
          {data.block_results_if_owing && fees.balance > 0 && <p className="small behind">Results are released once this term's fees are fully paid.</p>}
        </section>
        <section className="card">
          <h2>School fees · {TERM_NAMES[data.term]} term</h2>
          {!(fees.items || []).length ? <p className="muted small">Fees for this term have not been set yet.</p> : (
            <table className="list"><tbody>
              {fees.items.map((i: any) => <tr key={i.name}><td>{i.name}</td><td style={{ textAlign: "right" }}>{naira(i.amount)}</td></tr>)}
              {Number(fees.discount) > 0 && <tr><td>Discount / scholarship</td><td style={{ textAlign: "right" }}>−{naira(fees.discount)}</td></tr>}
              <tr><td>Paid</td><td style={{ textAlign: "right" }}>−{naira(fees.paid)}</td></tr>
              <tr><td><b>Balance</b></td><td style={{ textAlign: "right" }}><b className={fees.balance > 0 ? "behind" : ""}>{naira(fees.balance)}</b></td></tr>
            </tbody></table>
          )}
          {(fees.payments || []).length > 0 && (
            <p className="small muted">Payments: {fees.payments.map((p: any) => `${naira(p.amount)} on ${new Date(p.paid_on).toLocaleDateString("en-GB")} (receipt #${String(p.receipt_no).padStart(6, "0")})`).join("; ")}</p>
          )}
          <p className="small muted">Online payment is coming soon. For now, pay at the school or by transfer and keep your receipt.</p>
        </section>
      </div>
      {thisWeek && thisWeek.length > 0 && (
        <section className="card">
          <h2>Learning this week</h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            {thisWeek.map((t: any) => <li key={t.id}><b>{t.subjects?.name}:</b> {t.topic}</li>)}
          </ul>
        </section>
      )}
      {announcements && announcements.length > 0 && (
        <section className="card">
          <h2>School announcements</h2>
          {announcements.map((a: any) => (
            <div key={a.id} style={{ borderLeft: "4px solid var(--mark)", paddingLeft: 10 }}>
              <b>{a.title}</b> <span className="small muted">· {new Date(a.created_at).toLocaleDateString("en-GB")}</span>
              {a.body && <div className="small">{a.body}</div>}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
