const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrFmt2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 });

export const inr = (n: number) => inrFmt.format(n);
export const inr2 = (n: number) => inrFmt2.format(n);
export const num = (n: number) => numFmt.format(n);
export const pct = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`);
export const signedInr = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${inr(Math.abs(n))}`;

export function dateLabel(isoDate: string | null) {
  if (!isoDate) return "—";
  return new Date(isoDate.length === 10 ? isoDate + "T00:00:00Z" : isoDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function dateTimeLabel(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }) + " IST";
}

export const TXN_LABEL: Record<string, string> = {
  PURCHASE: "Purchase",
  SIP: "SIP instalment",
  REDEMPTION: "Redemption",
  SWITCH_IN: "Switch in",
  SWITCH_OUT: "Switch out",
};
