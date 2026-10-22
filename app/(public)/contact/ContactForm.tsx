"use client";

import { useState } from "react";

export default function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const f = new FormData(e.currentTarget);
    setState("sending");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        contact: f.get("contact"),
        topic: f.get("topic"),
        message: f.get("message"),
        consent: f.get("consent") === "on",
      }),
    });
    if (res.ok) return setState("sent");
    const data = await res.json().catch(() => null);
    setErr(data?.error?.message ?? "Couldn't send your message. Please try again.");
    setState("idle");
  }

  if (state === "sent") {
    return <div className="form-ok">Thanks — we&apos;ve received your message and will get back to you within one working day.</div>;
  }

  return (
    <form onSubmit={submit} noValidate>
      {err && (
        <div className="form-error" role="alert">
          {err}
        </div>
      )}
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="contact">Email or phone</label>
        <input id="contact" name="contact" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="topic">What is this about?</label>
        <select id="topic" name="topic" defaultValue="new_investor">
          <option value="new_investor">I want to start investing</option>
          <option value="portal_access">Portal access</option>
          <option value="servicing">Changes to an existing investment</option>
          <option value="grievance">Complaint / grievance</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="message">Message (optional)</label>
        <textarea id="message" name="message" rows={4} placeholder="Please don't include PAN, bank or folio numbers." />
      </div>
      <div className="field" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input id="consent" name="consent" type="checkbox" style={{ width: "auto", marginTop: 4 }} required />
        <label htmlFor="consent" style={{ fontWeight: 400 }}>
          I agree to be contacted about this request. See our <a href="/privacy">privacy notice</a>.
        </label>
      </div>
      <button className="btn btn-primary" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
