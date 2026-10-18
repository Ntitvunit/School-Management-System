import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForms from "./OnboardingForms";

export default async function Onboarding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).maybeSingle();
  if (profile?.school_id) redirect("/");
  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      <div>
        <h1>Set up your account</h1>
        <p className="muted">Proprietors and head teachers create the school. Staff, parents and students join with the 6-character code from the school admin.</p>
      </div>
      <OnboardingForms />
    </main>
  );
}
