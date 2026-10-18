"use client";
import { useActionState } from "react";

type Arm = { id: string; label: string };

export default function StudentForm({ action, arms, student, submitLabel }: {
  action: (state: any, form: FormData) => Promise<any>;
  arms: Arm[];
  student?: any;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null as any);
  const s = student || {};
  return (
    <form action={formAction} className="card">
      {s.id && <input type="hidden" name="id" value={s.id} />}
      <h2>Student details</h2>
      <div className="grid2">
        <label className="field" htmlFor="st-adm">Admission number *
          <input id="st-adm" name="admission_no" required defaultValue={s.admission_no || ""} placeholder="e.g. BFA/2026/014" />
        </label>
        <label className="field" htmlFor="st-class">Class
          <select id="st-class" name="class_arm_id" defaultValue={s.class_arm_id || ""}>
            <option value="">Not assigned</option>
            {arms.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="st-first">First name *
          <input id="st-first" name="first_name" required defaultValue={s.first_name || ""} />
        </label>
        <label className="field" htmlFor="st-last">Last name (surname) *
          <input id="st-last" name="last_name" required defaultValue={s.last_name || ""} />
        </label>
        <label className="field" htmlFor="st-other">Other names
          <input id="st-other" name="other_names" defaultValue={s.other_names || ""} />
        </label>
        <label className="field" htmlFor="st-gender">Gender
          <select id="st-gender" name="gender" defaultValue={s.gender || ""}>
            <option value="">—</option><option value="female">Female</option><option value="male">Male</option>
          </select>
        </label>
        <label className="field" htmlFor="st-dob">Date of birth
          <input id="st-dob" type="date" name="date_of_birth" defaultValue={s.date_of_birth || ""} />
        </label>
        <label className="field" htmlFor="st-status">Status
          <select id="st-status" name="status" defaultValue={s.status || "active"}>
            <option value="active">Active</option><option value="graduated">Graduated</option><option value="withdrawn">Withdrawn</option>
          </select>
        </label>
      </div>
      <h2>Parent / guardian</h2>
      <div className="grid2">
        <label className="field" htmlFor="st-gname">Name
          <input id="st-gname" name="guardian_name" defaultValue={s.guardian_name || ""} />
        </label>
        <label className="field" htmlFor="st-gphone">Phone
          <input id="st-gphone" name="guardian_phone" type="tel" defaultValue={s.guardian_phone || ""} placeholder="e.g. 0803 000 0000" />
        </label>
        <label className="field" htmlFor="st-gemail">Email
          <input id="st-gemail" name="guardian_email" type="email" defaultValue={s.guardian_email || ""} />
        </label>
        <label className="field" htmlFor="st-addr">Home address
          <input id="st-addr" name="address" defaultValue={s.address || ""} />
        </label>
      </div>
      <label className="field" htmlFor="st-med">Medical notes (allergies, conditions)
        <input id="st-med" name="medical_notes" defaultValue={s.medical_notes || ""} />
      </label>
      {state?.error && <div className="error">{state.error}</div>}
      <div><button className="btn" disabled={pending}>{pending ? "Saving…" : submitLabel}</button></div>
    </form>
  );
}
