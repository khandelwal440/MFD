import { BRAND_NAME } from "@/lib/config";

export const metadata = { title: "Privacy & consent" };

export default function Privacy() {
  return (
    <section className="section">
      <div className="container prose">
        <div className="eyebrow">Privacy</div>
        <h1>Privacy &amp; consent notice</h1>
        <p className="hint">
          Policy version 2026-10. Template content aligned to the Digital Personal Data Protection Act, 2023 — review with counsel before launch.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>Identity and contact details you provide for KYC and portal access.</li>
          <li>Mutual fund holdings, transactions and SIP details received from registrars/platforms for your linked accounts.</li>
          <li>Support requests and assistant conversations, kept only as long as needed to resolve them.</li>
          <li>Security logs (sign-ins, data access events) without passwords, OTPs or full identifiers.</li>
        </ul>

        <h2>Why we use it</h2>
        <p>We use your data to show your portfolio in the portal, answer your questions, service your investments and meet legal obligations.</p>

        <h2>Your consents</h2>
        <ul>
          <li>
            <b>Portfolio display</b> — lets the portal fetch and show your holdings, transactions and SIPs.
          </li>
          <li>
            <b>AI assistant</b> — lets the assistant read the same records to answer your questions. Relevant records are sent to our AI
            provider for that purpose under contract, and are not used to train models.
          </li>
        </ul>
        <p>You can withdraw either consent at any time by contacting us; the related feature stops working from that point.</p>

        <h2>Your rights</h2>
        <p>
          You can ask {BRAND_NAME} to access, correct or erase your personal data, or to nominate someone to exercise these rights. Contact our
          grievance officer through the contact page.
        </p>

        <h2>Security</h2>
        <p>
          Data is encrypted in transit and at rest, access is restricted and logged, and provider credentials are never exposed to your
          browser.
        </p>
      </div>
    </section>
  );
}
