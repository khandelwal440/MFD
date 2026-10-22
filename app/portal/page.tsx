import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { getHoldings, getPortfolioSummary, getSips, getTransactions } from "@/lib/services/portfolio";
import { DEFINITIONS } from "@/lib/services/calculations";
import { dateLabel, inr, pct, signedInr, TXN_LABEL } from "@/lib/format";
import FreshnessBanner from "@/components/FreshnessBanner";
import AccessNotice, { withAccess } from "@/components/AccessNotice";

export const metadata = { title: "Overview" };

const COLORS: Record<string, string> = { Equity: "#155e8c", Debt: "#c9952b", Hybrid: "#2f8f6b", Index: "#7a5cc4" };

export default async function Overview() {
  const { user } = await requireUser("investor");
  const res = await withAccess(() =>
    Promise.all([getPortfolioSummary(user.id), getHoldings(user.id), getTransactions(user.id, { limit: 5 }), getSips(user.id)]),
  );
  if (res.error) return <AccessNotice error={res.error} />;
  const [s, h, t, sips] = res.data;
  const unavailable = s.freshness.status === "unavailable";
  const upcoming = sips.sips.filter((x) => x.status === "ACTIVE" && x.nextDueDate).sort((a, b) => (a.nextDueDate! < b.nextDueDate! ? -1 : 1));

  return (
    <>
      <div className="page-head">
        <h1>Hello, {user.displayName.split(" ")[0]}</h1>
        <span className="meta">All values in INR</span>
      </div>
      <FreshnessBanner f={s.freshness} />

      {!unavailable && (
        <>
          <div className="grid grid-4">
            <div className="card stat">
              <div className="label">Current value</div>
              <div className="value">{inr(s.currentValue)}</div>
              <div className="sub muted">{s.holdingsCount} schemes</div>
            </div>
            <div className="card stat">
              <div className="label">Net invested</div>
              <div className="value">{inr(s.investedAmount)}</div>
              <div className="sub muted">Cash in minus cash out</div>
            </div>
            <div className="card stat">
              <div className="label">Gain / loss</div>
              <div className={`value ${s.absoluteGainLoss >= 0 ? "pos" : "neg"}`}>{signedInr(s.absoluteGainLoss)}</div>
              <div className={`sub ${s.absoluteGainLoss >= 0 ? "pos" : "neg"}`}>{pct(s.absoluteReturnPct)} absolute</div>
            </div>
            <div className="card stat">
              <div className="label">XIRR</div>
              <div className={`value ${(s.xirrPct ?? 0) >= 0 ? "pos" : "neg"}`}>{pct(s.xirrPct)}</div>
              <div className="sub muted">Annualised</div>
            </div>
          </div>

          <details className="defs mt">
            <summary>How these figures are calculated</summary>
            <dl>
              <dt>Current value</dt>
              <dd>{DEFINITIONS.currentValue}</dd>
              <dt>Net invested</dt>
              <dd>{DEFINITIONS.investedAmount}</dd>
              <dt>Gain / loss</dt>
              <dd>{DEFINITIONS.absoluteGainLoss}</dd>
              <dt>XIRR</dt>
              <dd>{DEFINITIONS.xirr}</dd>
            </dl>
          </details>

          <div className="grid grid-2 mt">
            <div className="card">
              <h3>Asset allocation</h3>
              <div className="alloc-bar" role="img" aria-label={s.allocation.map((a) => `${a.category} ${a.pct}%`).join(", ")}>
                {s.allocation.map((a) => (
                  <span key={a.category} style={{ width: `${a.pct}%`, background: COLORS[a.category] }} />
                ))}
              </div>
              <div className="alloc-legend">
                {s.allocation.map((a) => (
                  <div key={a.category}>
                    <span className="sw" style={{ background: COLORS[a.category] }} />
                    {a.category}
                    <span className="muted" style={{ marginLeft: 6 }}>
                      {inr(a.value)}
                    </span>
                    <b>{a.pct.toFixed(1)}%</b>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>Upcoming SIPs</h3>
                <Link href="/portal/sips" className="hint">
                  All SIPs →
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <p className="muted mt">No active SIPs.</p>
              ) : (
                <table className="mt">
                  <tbody>
                    {upcoming.map((x) => (
                      <tr key={x.mandate}>
                        <td className="scheme">
                          {x.schemeName.replace(" - Direct Growth", "")}
                          <small>Due {dateLabel(x.nextDueDate)}</small>
                        </td>
                        <td className="num">{inr(x.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card mt">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>Top holdings</h3>
              <Link href="/portal/holdings" className="hint">
                All holdings →
              </Link>
            </div>
            <div className="table-wrap mt">
              <table>
                <thead>
                  <tr>
                    <th>Scheme</th>
                    <th className="num">Value</th>
                    <th className="num">Gain / loss</th>
                  </tr>
                </thead>
                <tbody>
                  {h.holdings.slice(0, 4).map((x) => (
                    <tr key={x.schemeName + x.folio}>
                      <td className="scheme">
                        {x.schemeName}
                        <small>
                          {x.category} · NAV {x.nav} on {dateLabel(x.navDate)}
                        </small>
                      </td>
                      <td className="num">{inr(x.currentValue)}</td>
                      <td className={`num ${x.gainLoss >= 0 ? "pos" : "neg"}`}>{signedInr(x.gainLoss)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mt">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>Recent activity</h3>
              <Link href="/portal/transactions" className="hint">
                All transactions →
              </Link>
            </div>
            <div className="table-wrap mt">
              <table>
                <tbody>
                  {t.transactions.map((x) => (
                    <tr key={x.reference + x.date}>
                      <td style={{ whiteSpace: "nowrap" }}>{dateLabel(x.date)}</td>
                      <td className="scheme">
                        {TXN_LABEL[x.type]}
                        <small>{x.schemeName}</small>
                      </td>
                      <td className="num">{inr(x.amount)}</td>
                      <td>
                        <span className={`pill ${x.status}`}>{x.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
