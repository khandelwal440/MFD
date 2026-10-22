import { ARN, BRAND_NAME } from "@/lib/config";

export const metadata = { title: "Disclosures" };

export default function Disclosures() {
  return (
    <section className="section">
      <div className="container prose">
        <div className="eyebrow">Disclosures</div>
        <h1>Regulatory disclosures</h1>
        <p className="hint">Template content — have it reviewed by a qualified compliance professional before launch.</p>

        <h2>Distributor status</h2>
        <p>
          {BRAND_NAME} is a mutual fund distributor registered with the Association of Mutual Funds in India (AMFI) under {ARN}. We act as a
          distributor, not as a SEBI-registered Investment Adviser, and do not charge advisory fees.
        </p>

        <h2>Commissions</h2>
        <p>
          We receive commission from Asset Management Companies for investments made in regular plans of their schemes. Details of
          commissions received for your investments are available on request and in your Consolidated Account Statement.
        </p>

        <h2>Market risk</h2>
        <p>
          Mutual fund investments are subject to market risks. Read all scheme-related documents carefully before investing. Past performance
          is not indicative of future returns. NAVs and values shown in the portal can go up or down.
        </p>

        <h2>Data shown in the portal</h2>
        <p>
          Portfolio information is sourced from registrars and platforms through approved integrations and shown with its as-of time. Your
          AMC/RTA statements are the authoritative record. If you see a difference, please raise a support request.
        </p>

        <h2>AI assistant</h2>
        <p>
          The assistant gives general information and explains your own records. It is not investment advice and cannot place transactions.
          Answers may occasionally be incomplete; check important figures on your dashboard or statement.
        </p>
      </div>
    </section>
  );
}
