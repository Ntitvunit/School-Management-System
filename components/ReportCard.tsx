import { AFFECTIVE, PSYCHOMOTOR, RATING_TEXT, bands as schoolBands, gradeFor, ordinal, parts as schoolParts } from "@/lib/grading";
import { TERM_NAMES } from "@/lib/terms";

/** Printable report card built from the get_report_card / check_result_by_pin data. */
export default function ReportCard({ data }: { data: any }) {
  const sch = data.school || {};
  const ps = schoolParts({ assessment: sch.assessment });
  const bs = schoolBands({ grading: sch.grading });
  const st = data.student || {};
  const ov = data.overall || {};
  const rep = data.report || {};
  const att = data.attendance || {};
  const name = [st.last_name, st.first_name, st.other_names].filter(Boolean).join(" ");
  const avgGrade = ov.average !== undefined ? gradeFor(Number(ov.average), bs) : null;
  return (
    <article className="report">
      <header className="report-head">
        <div>
          <h1>{sch.name}</h1>
          {sch.motto && <div className="muted"><i>{sch.motto}</i></div>}
          {(sch.address || sch.phone) && <div className="small muted">{[sch.address, sch.phone].filter(Boolean).join(" · ")}</div>}
        </div>
        <div className="report-title">Report card<br /><span>{TERM_NAMES[data.term]} term · {data.session}</span></div>
      </header>
      <dl className="kv report-kv">
        <dt>Name</dt><dd><b>{name}</b></dd>
        <dt>Admission no.</dt><dd>{st.admission_no}</dd>
        <dt>Class</dt><dd>{data.class?.label}{st.stream ? ` (${st.stream})` : ""}</dd>
        <dt>Attendance</dt><dd>{att.total ? `${att.present} of ${att.total} days present` : "Not recorded"}</dd>
      </dl>
      <div className="table-wrap">
        <table className="list report-table">
          <thead>
            <tr>
              <th>Subject</th>
              {ps.map((p) => <th key={p.key}>{p.label} ({p.max})</th>)}
              <th>Total</th><th>Grade</th><th>Class avg</th><th>Highest</th><th>Lowest</th><th>Position</th><th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {(data.subjects || []).map((s: any) => {
              const g = gradeFor(s.total, bs);
              return (
                <tr key={s.subject}>
                  <td><b>{s.subject}</b></td>
                  {ps.map((p) => <td key={p.key}>{s.parts?.[p.key] ?? "—"}</td>)}
                  <td><b>{s.total ?? "—"}</b></td><td><b>{g.grade}</b></td>
                  <td>{s.class_avg ?? "—"}</td><td>{s.highest ?? "—"}</td><td>{s.lowest ?? "—"}</td>
                  <td>{ordinal(s.position)}</td><td>{g.remark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <section className="stats">
        <div className="stat"><div className="n">{ov.total ?? "—"}</div><div className="l">Total score</div></div>
        <div className="stat"><div className="n">{ov.average ?? "—"}</div><div className="l">Average{avgGrade ? ` · ${avgGrade.grade}` : ""}</div></div>
        <div className="stat"><div className="n">{ov.position ? ordinal(ov.position) : "—"}</div><div className="l">Position{ov.class_size ? ` out of ${ov.class_size}` : ""}</div></div>
        <div className="stat"><div className="n">{ov.subjects ?? 0}</div><div className="l">Subjects</div></div>
      </section>
      <div className="grid2">
        <RatingTable title="Affective domain" keys={AFFECTIVE} values={rep.affective} />
        <RatingTable title="Psychomotor skills" keys={PSYCHOMOTOR} values={rep.psychomotor} />
      </div>
      <dl className="kv report-kv">
        <dt>Class teacher's comment</dt><dd>{rep.teacher_comment || "—"}</dd>
        <dt>Head teacher / principal</dt><dd>{rep.principal_comment || "—"}</dd>
        {sch.next_term_begins && <><dt>Next term begins</dt><dd>{new Date(sch.next_term_begins).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd></>}
      </dl>
      <p className="small muted">Grading: {bs.map((b) => `${b.grade} ${b.min}+`).join(" · ")} · Ratings: 5 Excellent, 4 Very good, 3 Good, 2 Fair, 1 Poor</p>
    </article>
  );
}

function RatingTable({ title, keys, values }: { title: string; keys: string[]; values?: Record<string, number> }) {
  return (
    <div className="block">
      <h4>{title}</h4>
      <table className="list"><tbody>
        {keys.map((k) => <tr key={k}><td>{k}</td><td style={{ textAlign: "right" }}>{values?.[k] ? `${values[k]} · ${RATING_TEXT[values[k]]}` : "—"}</td></tr>)}
      </tbody></table>
    </div>
  );
}
