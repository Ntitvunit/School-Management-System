"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    const supabase = createClient();
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
      router.push("/");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setBusy(false);
      if (error) return setError(error.message);
      if (data.session) { router.push("/onboarding"); router.refresh(); }
      else setNotice("Account created. Check your email for a confirmation link, then sign in.");
    }
  }

  return (
    <main className="auth">
      <div className="card">
        <div>
          <h1>{mode === "signin" ? "Sign in" : "Create an account"}</h1>
          <p className="muted small">Scheme of work, lesson notes and coverage for your school.</p>
        </div>
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label className="field" htmlFor="email">Email
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="field" htmlFor="password">Password
            <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </label>
          {error && <div className="error">{error}</div>}
          {notice && <div className="notice">{notice}</div>}
          <button className="btn" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="small muted">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </a>
        </p>
      </div>
    </main>
  );
}
