"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MODES = [
  { id: "none", label: "Healthy" },
  { id: "TEMP_UNAVAILABLE", label: "Outage" },
  { id: "RATE_LIMITED", label: "Rate limited" },
  { id: "AUTH_EXPIRED", label: "Credentials expired" },
];

export default function AdminActions({ failMode }: { failMode: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function call(body: unknown) {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) return setNote(data?.error?.message ?? "Failed");
    if (data.jobs) setNote(`Sync finished: ${data.jobs.map((j: { status: string; errorCode: string | null; attempts: number }) => `${j.status}${j.errorCode ? ` (${j.errorCode}, ${j.attempts} attempts)` : ""}`).join(", ")}`);
    router.refresh();
  }

  return (
    <div>
      <div className="row">
        <button className="btn btn-primary" disabled={busy} onClick={() => call({ action: "run" })}>
          {busy ? "Working…" : "Run sync now"}
        </button>
      </div>
      <div className="mt">
        <label>Simulate sample-provider condition</label>
        <div className="row">
          {MODES.map((m) => (
            <button
              key={m.id}
              className="chip"
              disabled={busy}
              style={failMode === m.id ? { background: "#0e3b5c", color: "#fff" } : undefined}
              onClick={() => call({ action: "simulate", failMode: m.id })}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          For testing stale/unavailable states. Pick a condition, then run a sync and open an investor dashboard.
        </p>
      </div>
      {note && <div className="form-ok">{note}</div>}
    </div>
  );
}
