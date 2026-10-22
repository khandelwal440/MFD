import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { getTransactions } from "@/lib/services/portfolio";
import type { TxnType } from "@/lib/db/types";
import { dateLabel, inr, inr2, num, TXN_LABEL } from "@/lib/format";
import FreshnessBanner from "@/components/FreshnessBanner";
import AccessNotice, { withAccess } from "@/components/AccessNotice";

export const metadata = { title: "Transactions" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES: TxnType[] = ["PURCHASE", "SIP", "REDEMPTION", "SWITCH_IN", "SWITCH_OUT"];
const PAGE = 20;

type SP = { from?: string; to?: string; type?: string; cursor?: string };

export default async function Transactions({ searchParams }: { searchParams: Promise<SP> }) {
  const { user } = await requireUser("investor");
  const sp = await searchParams;
  const from = sp.from && DATE.test(sp.from) ? sp.from : undefined;
  const to = sp.to && DATE.test(sp.to) ? sp.to : undefined;
  const type = TYPES.find((t) => t === sp.type);
  const cursor = Math.max(0, Number.parseInt(sp.cursor ?? "0", 10) || 0);
  const res = await withAccess(() => getTransactions(user.id, { from, to, type, cursor, limit: PAGE }));
  if (res.error) return <AccessNotice error={res.error} />;
  const { transactions, total, nextCursor, freshness } = res.data;

  const qs = (c: number) => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (type) p.set("type", type);
    if (c) p.set("cursor", String(c));
    const s = p.toString();
    return `/portal/transactions${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <div className="page-head">
        <h1>Transactions</h1>
        <span className="meta">{total} records</span>
      </div>
      <FreshnessBanner f={freshness} />
      <form className="filters" method="get">
        <div className="field">
          <label htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={to} />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue={type ?? ""}>
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TXN_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary">Apply</button>
        <Link href="/portal/transactions" className="btn btn-ghost">
          Reset
        </Link>
      </form>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Scheme</th>
                <th className="num">Amount</th>
                <th className="num">Units</th>
                <th className="num">NAV</th>
                <th>Status</th>
                <th>Ref</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    No transactions match these filters.
                  </td>
                </tr>
              )}
              {transactions.map((t) => (
                <tr key={t.reference + t.date + t.type}>
                  <td style={{ whiteSpace: "nowrap" }}>{dateLabel(t.date)}</td>
                  <td>{TXN_LABEL[t.type]}</td>
                  <td>{t.schemeName}</td>
                  <td className="num">{inr(t.amount)}</td>
                  <td className="num">{t.units ? num(t.units) : "—"}</td>
                  <td className="num">{inr2(t.nav)}</td>
                  <td>
                    <span className={`pill ${t.status}`}>{t.status}</span>
                  </td>
                  <td className="hint" style={{ fontFamily: "monospace" }}>
                    {t.reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="row mt" style={{ justifyContent: "space-between" }}>
        <span className="hint">
          Showing {total ? cursor + 1 : 0}–{cursor + transactions.length} of {total}
        </span>
        <div className="row">
          {cursor > 0 && (
            <Link className="btn btn-ghost btn-sm" href={qs(Math.max(0, cursor - PAGE))}>
              ← Newer
            </Link>
          )}
          {nextCursor !== null && (
            <Link className="btn btn-ghost btn-sm" href={qs(nextCursor)}>
              Older →
            </Link>
          )}
        </div>
      </div>
      <p className="hint">Failed or pending transactions don&apos;t affect your invested amount or units until they succeed.</p>
    </>
  );
}
