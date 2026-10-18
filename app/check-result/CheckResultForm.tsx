"use client";
import { useActionState } from "react";
import { checkResult } from "./actions";
import ReportCardClient from "@/components/ReportCardClient";

export default function CheckResultForm() {
  const [state, action, pending] = useActionState(checkResult, null as any);
  return (
    <>
      {!state?.data && (
        <form action={action} className="card" style={{ maxWidth: 460, margin: "6vh auto 0" }}>
          <div>
            <h1>Check a result</h1>
            <p className="muted small">Enter the 12-digit PIN from your scratch card and the student's admission number.</p>
          </div>
          <label className="field" htmlFor="cr-pin">PIN<input id="cr-pin" name="pin" required inputMode="numeric" placeholder="1234 5678 9012" autoComplete="off" /></label>
          <label className="field" htmlFor="cr-adm">Admission number<input id="cr-adm" name="admission_no" required placeholder="e.g. BFA/2026/014" /></label>
          {state?.error && <div className="error">{state.error}</div>}
          <button className="btn" disabled={pending}>{pending ? "Checking…" : "Check result"}</button>
        </form>
      )}
      {state?.data && (
        <>
          <div className="row no-print" style={{ justifyContent: "space-between" }}>
            <span className="small muted">PIN uses left: {state.data.pin_uses_left}</span>
            <button type="button" className="btn ghost small" onClick={() => window.print()}>Print / save as PDF</button>
          </div>
          <ReportCardClient data={state.data} />
        </>
      )}
    </>
  );
}
