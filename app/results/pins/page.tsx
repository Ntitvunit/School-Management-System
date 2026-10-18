import Link from "next/link";
import { requireMember, TERM_NAMES } from "@/lib/session";
import PrintButton from "@/components/PrintButton";
import { makePins } from "../actions";

export default async function Pins({ searchParams }: { searchParams: Promise<{ made?: string }> }) {
  const sp = await searchParams;
  const { supabase, school } = await requireMember(["admin"]);
  const { data: pins } = await supabase.from("result_pins").select("serial, pin, uses, max_uses, student_id, students(admission_no)")
    .eq("school_id", school.id).eq("session", school.current_session).eq("term", school.current_term).order("serial");
  const fmt = (p: string) => p.replace(/(\d{4})(?=\d)/g, "$1 ");
  return (
    <main className="page">
      <div className="row no-print" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Result-checking PINs</h1>
          <p className="muted small">{school.current_session} · {TERM_NAMES[school.current_term]} term. Parents enter a PIN and the admission number at <b>/check-result</b> on this website. Each PIN works for one student, up to 5 times, and only after you publish that class's results.</p>
        </div>
        <PrintButton label="Print PIN slips" />
      </div>
      {sp.made && <div className="notice no-print">{sp.made} new PINs created.</div>}
      <form className="card row no-print" action={makePins}>
        <label className="field" htmlFor="pin-count">How many PINs
          <input id="pin-count" name="count" type="number" min={1} max={500} defaultValue={50} />
        </label>
        <button className="btn">Create PINs</button>
        <Link className="small" href="/check-result" target="_blank">Open the parent result checker</Link>
      </form>
      {!pins?.length ? <div className="card">No PINs for this term yet.</div> : (
        <section className="pin-grid">
          {pins.map((p: any) => (
            <div key={p.serial} className="pin-slip">
              <div className="small muted">{school.name} · Result PIN · {TERM_NAMES[school.current_term]} term {school.current_session}</div>
              <div className="pin">{fmt(p.pin)}</div>
              <div className="small">Serial {String(p.serial).padStart(5, "0")} · {p.student_id ? `Used by ${p.students?.admission_no} (${p.uses}/${p.max_uses})` : "Unused"}</div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
