import Link from "next/link";

export const metadata = { title: "Services" };

const SERVICES = [
  { icon: "🌱", title: "Start a SIP", body: "Set up monthly or quarterly SIPs with an auto-debit mandate. We help with scheme documents, mandate registration and first-instalment checks." },
  { icon: "💼", title: "Lump-sum investments", body: "Invest a one-time amount in equity, debt, hybrid or index schemes, with the Scheme Information Document and KIM shared before you invest." },
  { icon: "📑", title: "Portfolio reviews", body: "Periodic walk-throughs of your holdings, asset mix and SIP progress, with clear explanations of returns and costs." },
  { icon: "🔧", title: "Investor servicing", body: "Changes to bank mandate, nominee, contact details, folio consolidation, redemptions and switches — we coordinate with the AMC/RTA." },
  { icon: "🧾", title: "Statements & tax documents", body: "Help obtaining Consolidated Account Statements and capital-gains statements from CAMS, KFintech or MF Central." },
  { icon: "📱", title: "Online portal & assistant", body: "A secure, read-only dashboard of your mutual fund portfolio and an assistant that answers questions from your own records." },
];

export default function Services() {
  return (
    <section className="section">
      <div className="container">
        <div className="eyebrow">Services</div>
        <h1>How we help investors</h1>
        <p className="muted" style={{ maxWidth: 680 }}>
          We are a mutual fund distributor. We help you invest in and service mutual fund schemes. We don&apos;t provide investment advisory
          services under SEBI&apos;s Investment Adviser regulations.
        </p>
        <div className="grid grid-3 mt">
          {SERVICES.map((s) => (
            <div className="card" key={s.title}>
              <div className="icon-dot">{s.icon}</div>
              <h3>{s.title}</h3>
              <p className="muted">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="card mt">
          <h3>Online transactions</h3>
          <p className="muted">
            Purchases, redemptions and SIP changes are not available in the portal yet. They will be added only after the relevant platforms
            approve the integration and it has been fully tested. Until then, <Link href="/contact">contact us</Link> and we&apos;ll process
            requests through the official channels.
          </p>
        </div>
      </div>
    </section>
  );
}
