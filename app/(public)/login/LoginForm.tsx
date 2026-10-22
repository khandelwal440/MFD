"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "otp">("password");
  const [pendingId, setPendingId] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error?.message ?? "Something went wrong.");
    return data;
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErr(null);
    setBusy(true);
    try {
      const data = await post("/api/auth/login", { email: f.get("email"), password: f.get("password") });
      setPendingId(data.pendingId);
      setDevOtp(data.devOtp ?? null);
      setStep("otp");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErr(null);
    setBusy(true);
    try {
      const data = await post("/api/auth/verify", { pendingId, otp: String(f.get("otp") ?? "") });
      router.replace(data.redirect);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h1 style={{ fontSize: "1.5rem" }}>{step === "password" ? "Investor login" : "Enter your one-time code"}</h1>
      <p className="muted">
        {step === "password" ? "Sign in to view your portfolio." : "We've sent a 6-digit code to your registered mobile and email."}
      </p>
      {err && (
        <div className="form-error" role="alert">
          {err}
        </div>
      )}
      {step === "password" ? (
        <form key="password" onSubmit={onPassword}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Checking…" : "Continue"}
          </button>
          <p className="hint" style={{ marginTop: 14 }}>
            No login yet? <a href="/contact">Request portal access</a>.
          </p>
        </form>
      ) : (
        <form key="otp" onSubmit={onOtp}>
          <div className="field">
            <label htmlFor="otp">6-digit code</label>
            <input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Verifying…" : "Verify and sign in"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm mt" onClick={() => setStep("password")}>
            ← Back
          </button>
          {devOtp && (
            <div className="dev-note">
              Development mode: no SMS/email is sent. Your code is <b>{devOtp}</b> (also printed in the server console).
            </div>
          )}
        </form>
      )}
      {step === "password" && process.env.NODE_ENV !== "production" && (
        <div className="dev-note">Development build: demo investor and admin logins are listed in README.md.</div>
      )}
    </div>
  );
}
