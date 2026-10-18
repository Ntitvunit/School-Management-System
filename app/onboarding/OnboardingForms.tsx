"use client";
import { useActionState } from "react";
import { createSchool, joinAsStudent, joinSchool } from "./actions";

export default function OnboardingForms() {
  const [createState, createAction, creating] = useActionState(createSchool, null as any);
  const [joinState, joinAction, joining] = useActionState(joinSchool, null as any);
  const [stuState, stuAction, stuJoining] = useActionState(joinAsStudent, null as any);
  return (
    <div className="cols">
      <form className="card" action={createAction}>
        <h2>Create a school</h2>
        <label className="field" htmlFor="c-school">School name<input id="c-school" name="school_name" required placeholder="e.g. Bright Future Academy" /></label>
        <label className="field" htmlFor="c-name">Your full name<input id="c-name" name="full_name" required /></label>
        {createState?.error && <div className="error">{createState.error}</div>}
        <button className="btn" disabled={creating}>{creating ? "Creating…" : "Create school"}</button>
        <p className="small muted">For proprietors and head teachers. You become the school admin.</p>
      </form>
      <form className="card" action={joinAction}>
        <h2>Join as staff or parent</h2>
        <label className="field" htmlFor="j-code">School code<input id="j-code" name="code" required maxLength={6} placeholder="e.g. 7F3A9C" style={{ textTransform: "uppercase" }} /></label>
        <label className="field" htmlFor="j-name">Your full name<input id="j-name" name="full_name" required /></label>
        <label className="field" htmlFor="j-role">I am a
          <select id="j-role" name="role" defaultValue="teacher"><option value="teacher">Teacher / staff</option><option value="parent">Parent / guardian</option></select>
        </label>
        {joinState?.error && <div className="error">{joinState.error}</div>}
        <button className="btn" disabled={joining}>{joining ? "Joining…" : "Join school"}</button>
        <p className="small muted">The admin can later make staff a bursar or admin.</p>
      </form>
      <form className="card" action={stuAction}>
        <h2>Join as a student</h2>
        <label className="field" htmlFor="s-code">School code<input id="s-code" name="code" required maxLength={6} style={{ textTransform: "uppercase" }} /></label>
        <label className="field" htmlFor="s-adm">Admission number<input id="s-adm" name="admission_no" required /></label>
        <label className="field" htmlFor="s-dob">Date of birth<input id="s-dob" name="dob" type="date" /></label>
        <label className="field" htmlFor="s-name">Your full name<input id="s-name" name="full_name" required /></label>
        {stuState?.error && <div className="error">{stuState.error}</div>}
        <button className="btn" disabled={stuJoining}>{stuJoining ? "Joining…" : "Join as student"}</button>
      </form>
    </div>
  );
}
