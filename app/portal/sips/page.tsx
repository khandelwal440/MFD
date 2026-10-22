import { requireUser } from "@/lib/auth/guard";
import { getSips } from "@/lib/services/portfolio";
import { dateLabel, inr } from "@/lib/format";
import FreshnessBanner from "@/components/FreshnessBanner";
import AccessNotice, { withAccess } from "@/components/AccessNotice";

export const metadata = { title: "SIPs" };

export default async function Sips() {
  const { user } = await requireUser("investor");
  const res = await withAccess(() => getSips(user.id));
  if (res.error) return <AccessNotice error={res.error} />;
  const { sips, freshness } = res.data;
  const monthly = sips.filter((s) => s.status === "ACTIVE").reduce((t, s) => t + (s.frequency === "MONTHLY" ? s.amount : s.amount / 3), 0);

  return (
    <>
      <div className="page-head">
        <h1>SIPs</h1>
        <span className="meta">{inr(monthly)} per month across active SIPs</span>
      </div>
      <FreshnessBanner f={freshness} />
      <div className="grid grid-2">
        {sips.map((s) => (
          <div className="card" key={s.mandate}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ margin: 0, maxWidth: "75%" }}>{s.schemeName}</h3>
              <span className={`pill ${s.status}`}>{s.status}</span>
            </div>
            <div className="defs">
              <dl>
                <dt>Amount</dt>
                <dd>
                  {inr(s.amount)} · {s.frequency.toLowerCase()}
                </dd>
                <dt>Next due</dt>
                <dd>{s.status === "ACTIVE" ? dateLabel(s.nextDueDate) : "—"}</dd>
                <dt>Last instalment</dt>
                <dd>{s.lastInstallmentStatus ? <span className={`pill ${s.lastInstallmentStatus}`}>{s.lastInstallmentStatus}</span> : "—"}</dd>
                <dt>Mandate</dt>
                <dd style={{ fontFamily: "monospace" }}>{s.mandate}</dd>
              </dl>
            </div>
          </div>
        ))}
      </div>
      {sips.length === 0 && <div className="card empty">No SIP mandates on record.</div>}
      <p className="hint mt">
        Instalment status is as reported by the provider; a scheduled date doesn&apos;t mean the instalment succeeded. To start, pause or stop a
        SIP, raise a support request.
      </p>
    </>
  );
}
