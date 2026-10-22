import type { Freshness } from "@/lib/services/portfolio";
import { dateTimeLabel } from "@/lib/format";

export default function FreshnessBanner({ f }: { f: Freshness }) {
  const icon = f.status === "fresh" ? "✓" : "⚠";
  return (
    <div className={`banner ${f.status}`} role={f.status === "fresh" ? "status" : "alert"}>
      <span aria-hidden style={{ fontWeight: 700 }}>
        {icon}
      </span>
      <div>
        <b>{f.status === "fresh" ? "Up to date" : f.status === "stale" ? "Data may be out of date" : "Data unavailable"}</b> — {f.message}
        <div style={{ fontSize: "0.82rem", opacity: 0.85, marginTop: 2 }}>
          {f.asOf ? `Last verified ${dateTimeLabel(f.asOf)}` : "Never synced"} · Source: {f.sources.join(", ")}
        </div>
      </div>
    </div>
  );
}
