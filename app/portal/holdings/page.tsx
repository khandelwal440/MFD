import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { getHoldings } from "@/lib/services/portfolio";
import type { SchemeCategory } from "@/lib/db/types";
import { dateLabel, dateTimeLabel, inr, inr2, num, signedInr } from "@/lib/format";
import FreshnessBanner from "@/components/FreshnessBanner";
import AccessNotice, { withAccess } from "@/components/AccessNotice";

export const metadata = { title: "Holdings" };

const CATEGORIES: SchemeCategory[] = ["Equity", "Debt", "Hybrid", "Index"];
const ACTIVE = { background: "#0e3b5c", color: "#fff" };

export default async function Holdings({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { user } = await requireUser("investor");
  const sp = await searchParams;
  const category = CATEGORIES.find((c) => c === sp.category);
  const res = await withAccess(() => getHoldings(user.id, { category }));
  if (res.error) return <AccessNotice error={res.error} />;
  const { holdings, freshness } = res.data;
  const total = holdings.reduce((s, h) => s + h.currentValue, 0);

  return (
    <>
      <div className="page-head">
        <h1>Holdings</h1>
        <span className="meta">
          {holdings.length} schemes · {inr(total)}
        </span>
      </div>
      <FreshnessBanner f={freshness} />
      <div className="row" style={{ marginBottom: 14 }} role="group" aria-label="Filter by category">
        <Link className="chip" href="/portal/holdings" aria-current={!category ? "true" : undefined} style={!category ? ACTIVE : undefined}>
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            className="chip"
            href={`/portal/holdings?category=${c}`}
            aria-current={category === c ? "true" : undefined}
            style={category === c ? ACTIVE : undefined}
          >
            {c}
          </Link>
        ))}
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Scheme</th>
                <th>Folio</th>
                <th className="num">Units</th>
                <th className="num">NAV</th>
                <th className="num">Invested</th>
                <th className="num">Current value</th>
                <th className="num">Gain / loss</th>
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    No holdings{category ? ` in ${category}` : ""}.
                  </td>
                </tr>
              )}
              {holdings.map((h) => (
                <tr key={h.schemeName + h.folio}>
                  <td className="scheme">
                    {h.schemeName}
                    <small>{h.category}</small>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{h.folio}</td>
                  <td className="num">{num(h.units)}</td>
                  <td className="num">
                    {inr2(h.nav)}
                    <div className="hint">{dateLabel(h.navDate)}</div>
                  </td>
                  <td className="num">{inr(h.investedAmount)}</td>
                  <td className="num">
                    <b>{inr(h.currentValue)}</b>
                  </td>
                  <td className={`num ${h.gainLoss >= 0 ? "pos" : "neg"}`}>
                    {signedInr(h.gainLoss)}
                    {h.investedAmount > 0 && <div className="hint">{((h.gainLoss / h.investedAmount) * 100).toFixed(2)}%</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {holdings[0] && (
        <p className="hint mt">
          Values as of {dateTimeLabel(holdings[0].asOf)} from {holdings[0].source}. Folio numbers are masked. Invested amount is net cash
          invested in that scheme (switches and redemptions deducted at transaction value).
        </p>
      )}
    </>
  );
}
