import { getContext } from "@/lib/context";

export default async function Suspended() {
  const { school } = await getContext();
  return (
    <main className="auth">
      <div className="card">
        <h1>Account paused</h1>
        <p>{school?.name ? `${school.name}'s` : "This school's"} access to the School Management System is currently paused.</p>
        <p className="muted small">Please contact the system provider to restore access. No records have been deleted.</p>
      </div>
    </main>
  );
}
