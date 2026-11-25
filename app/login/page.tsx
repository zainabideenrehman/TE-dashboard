"use client";
import { useState } from "react";
import { LockKeyhole, ArrowRight } from "lucide-react";
export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-center gap-3 text-sm font-semibold text-slate-700"><span className="rounded-xl bg-slate-900 p-3 text-white"><LockKeyhole size={22}/></span>Agency Command Center</div>
      <h1 className="mb-2">Welcome back</h1><p className="mb-7 text-sm text-slate-500">Sign in to your agency dashboard.</p>
      <form className="grid gap-5" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError("");
        const form = new FormData(e.currentTarget);
        try {
          const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
          const result = await response.json();
          if (!response.ok) throw Error(result.error);
          window.location.replace("/");
        } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in. Please try again."); setBusy(false); }
      }}>
        <label>Email address<input name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@company.com"/></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}<ArrowRight size={16}/></button>
      </form><p className="mt-7 text-xs text-slate-500">Access is limited to approved accounts. Contact the dashboard owner for access or a password reset.</p>
    </section>
  </main>;
}
