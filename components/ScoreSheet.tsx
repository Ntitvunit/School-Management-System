"use client";
import { useActionState, useState } from "react";

type Part = { key: string; label: string; max: number };
type Band = { min: number; grade: string; remark: string };

export default function ScoreSheet({ action, students, parts, bands, initial, hidden, readOnly }: {
  action: (s: any, f: FormData) => Promise<any>;
  students: { id: string; name: string; admission_no: string }[];
  parts: Part[];
  bands: Band[];
  initial: Record<string, Record<string, number>>;
  hidden: Record<string, string>;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null as any);
  const [vals, setVals] = useState<Record<string, Record<string, string>>>(() => {
    const o: Record<string, Record<string, string>> = {};
    for (const s of students) {
      o[s.id] = {};
      for (const p of parts) o[s.id][p.key] = initial[s.id]?.[p.key] !== undefined ? String(initial[s.id][p.key]) : "";
    }
    return o;
  });
  const sorted = bands.slice().sort((a, b) => b.min - a.min);
  const totalOf = (id: string) => {
    const v = parts.map((p) => vals[id]?.[p.key]).filter((x) => x !== "" && x !== undefined);
    return v.length ? v.reduce((a, x) => a + Number(x), 0) : null;
  };
  const gradeOf = (t: number | null) => (t === null ? "" : (sorted.find((b) => t >= b.min) || sorted[sorted.length - 1])?.grade || "");
  const max = parts.reduce((a, p) => a + Number(p.max), 0);

  return (
    <form action={formAction} className="card">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="student_ids" value={students.map((s) => s.id).join(",")} />
      <div className="table-wrap">
        <table className="list scores">
          <thead>
            <tr>
              <th>Student</th>
              {parts.map((p) => <th key={p.key} style={{ textAlign: "center" }}>{p.label}<br /><span className="muted">/{p.max}</span></th>)}
              <th style={{ textAlign: "center" }}>Total<br /><span className="muted">/{max}</span></th>
              <th style={{ textAlign: "center" }}>Grade</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const t = totalOf(s.id);
              return (
                <tr key={s.id}>
                  <td><b>{s.name}</b><div className="small muted">{s.admission_no}</div></td>
                  {parts.map((p) => {
                    const v = vals[s.id]?.[p.key] ?? "";
                    const bad = v !== "" && (Number(v) > Number(p.max) || Number(v) < 0);
                    return (
                      <td key={p.key} style={{ textAlign: "center" }}>
                        <input name={`s_${s.id}_${p.key}`} type="number" inputMode="decimal" step="0.5" min={0} max={p.max}
                          value={v} disabled={readOnly} aria-label={`${s.name} ${p.label}`}
                          onChange={(e) => setVals((o) => ({ ...o, [s.id]: { ...o[s.id], [p.key]: e.target.value } }))}
                          style={{ width: 70, textAlign: "center", borderColor: bad ? "var(--warn)" : undefined }} />
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "center", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{t ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>{gradeOf(t)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {state?.error && <div className="error">{state.error}</div>}
      {state?.saved !== undefined && !state?.error && <div className="notice">Saved {state.saved} student{state.saved === 1 ? "" : "s"}.</div>}
      {!readOnly && <div className="row"><button className="btn" disabled={pending}>{pending ? "Saving…" : "Save scores"}</button>
        <span className="small muted">Marks above the maximum are reduced to the maximum. Leave a row blank to skip it.</span></div>}
    </form>
  );
}
