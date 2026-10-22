"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SupportForm({ categories }: { categories: { id: string; label: string }[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setErr(null);
    setOk(null);
    setBusy(true);
    const res = await fetch("/api/support-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: f.get("category"), description: f.get("description") }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return setErr(data?.error?.message ?? "Couldn't submit. Please try again.");
    setOk(`Request ${data.reference} created. We'll reply within one working day.`);
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      {err && (
        <div className="form-error" role="alert">
          {err}
        </div>
      )}
      {ok && (
        <div className="form-ok" role="status">
          {ok}
        </div>
      )}
      <div className="field">
        <label htmlFor="category">Topic</label>
        <select id="category" name="category" defaultValue={categories[0].id}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="description">Describe the issue</label>
        <textarea id="description" name="description" rows={5} required minLength={10} maxLength={1000} />
        <div className="hint">Please don&apos;t include PAN, bank or full folio numbers — we&apos;ll remove them automatically.</div>
      </div>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
