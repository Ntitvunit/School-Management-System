import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";
import { schoolLevels } from "@/lib/levels";
import { naira } from "@/lib/money";
import AutoSelect from "@/components/AutoSelect";
import { addFeeItem, copyFees, deleteFeeItem } from "../actions";

export default async function Fees({ searchParams }: { searchParams: Promise<{ term?: string; saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const { supabase, school } = await requireMember(["admin", "bursar"]);
  const term = Number(sp.term) || school.current_term;
  const levels = schoolLevels(school);
  const [{ data: items }, { data: classesRaw }] = await Promise.all([
    supabase.from("fee_items").select("*").eq("school_id", school.id).eq("session", school.current_session).eq("term", term).order("class_code", { nullsFirst: true }).order("name"),
    supabase.from("class_levels").select("code, name, level, sort_order").order("sort_order"),
  ]);
  const classes = (classesRaw || []).filter((c: any) => levels.includes(c.level));
  const cname = new Map(classes.map((c: any) => [c.code, c.name]));
  const common = (items || []).filter((i: any) => !i.class_code).reduce((a: number, i: any) => a + Number(i.amount), 0);
  return (
    <main className="page" style={{ maxWidth: 960 }}>
      <div>
        <Link href="/finance" className="small">← Finance</Link>
        <h1>Fee structure</h1>
        <p className="muted small">{school.current_session}. Items for “All classes” apply to every student; class items add to them.</p>
      </div>
      {sp.saved && <div className="notice">Saved.</div>}
      {sp.error && <div className="error">Enter an item name and an amount.</div>}
      <form className="card row" method="get" action="/finance/fees">
        <label className="field" htmlFor="fe-term">Term
          <AutoSelect id="fe-term" name="term" defaultValue={String(term)}>{[1, 2, 3].map((n) => <option key={n} value={n}>{TERM_NAMES[n]} term</option>)}</AutoSelect>
        </label>
      </form>
      <form className="card" action={addFeeItem}>
        <h2>Add a fee item · {TERM_NAMES[term]} term</h2>
        <input type="hidden" name="term" value={term} />
        <div className="row">
          <label className="field" htmlFor="fe-name" style={{ flex: "1 1 200px" }}>Item<input id="fe-name" name="name" required placeholder="e.g. Tuition, PTA levy, Books, Uniform" /></label>
          <label className="field" htmlFor="fe-amt">Amount (₦)<input id="fe-amt" name="amount" required inputMode="decimal" placeholder="45,000" /></label>
          <label className="field" htmlFor="fe-class">Applies to
            <select id="fe-class" name="class_code" defaultValue=""><option value="">All classes</option>{classes.map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
          </label>
          <button className="btn">Add</button>
        </div>
      </form>
      <div className="card table-wrap">
        <h2>{TERM_NAMES[term]} term items</h2>
        {!items?.length ? (
          <div className="row"><p className="muted" style={{ margin: 0 }}>No fee items for this term yet.</p>
            {term > 1 && (
              <form action={copyFees}><input type="hidden" name="from_term" value={term - 1} /><input type="hidden" name="to_term" value={term} />
                <button className="btn ghost small">Copy from {TERM_NAMES[term - 1]} term</button></form>
            )}
          </div>
        ) : (
          <table className="list">
            <thead><tr><th>Item</th><th>Applies to</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {items.map((i: any) => (
                <tr key={i.id}>
                  <td><b>{i.name}</b></td><td>{i.class_code ? cname.get(i.class_code) || i.class_code : "All classes"}</td><td>{naira(i.amount)}</td>
                  <td><form action={deleteFeeItem}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="term" value={term} /><button className="btn warn small">Delete</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card table-wrap">
        <h2>Total per class this term</h2>
        <table className="list">
          <thead><tr><th>Class</th><th>Total fees</th></tr></thead>
          <tbody>
            {classes.map((c: any) => {
              const t = common + (items || []).filter((i: any) => i.class_code === c.code).reduce((a: number, i: any) => a + Number(i.amount), 0);
              return <tr key={c.code}><td>{c.name}</td><td><b>{naira(t)}</b></td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
