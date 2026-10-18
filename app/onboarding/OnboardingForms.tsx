"use client";
import { useActionState } from "react";
import { createSchool, joinSchool } from "./actions";

export default function OnboardingForms() {
  const [createState, createAction, creating] = useActionState(createSchool, null as any);
  const [joinState, joinAction, joining] = useActionState(joinSchool, null as any);
  return (
    <div className="cols">
      <form className="card" action={createAction}>
        <h2>Create a school</h2>
        <label className="field" htmlFor="c-school">School name
          <input id="c-school" name="school_name" required placeholder="e.g. Bright Future Academy" />
        </label>
        <label className="field" htmlFor="c-name">Your full name
          <input id="c-name" name="full_name" required />
        </label>
        {createState?.error && <div className="error">{createState.error}</div>}
        <button className="btn" disabled={creating}>{creating ? "Creating…" : "Create school"}</button>
        <p className="small muted">You become the school admin. Classes Pre-Nursery to Primary 6 are set up with arm A.</p>
      </form>
      <form className="card" action={joinAction}>
        <h2>Join a school</h2>
        <label className="field" htmlFor="j-code">School code
          <input id="j-code" name="code" required maxLength={6} placeholder="e.g. 7F3A9C" style={{ textTransform: "uppercase" }} />
        </label>
        <label className="field" htmlFor="j-name">Your full name
          <input id="j-name" name="full_name" required />
        </label>
        <label className="field" htmlFor="j-role">I am a
          <select id="j-role" name="role" defaultValue="teacher">
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
          </select>
        </label>
        {joinState?.error && <div className="error">{joinState.error}</div>}
        <button className="btn" disabled={joining}>{joining ? "Joining…" : "Join school"}</button>
      </form>
    </div>
  );
}
