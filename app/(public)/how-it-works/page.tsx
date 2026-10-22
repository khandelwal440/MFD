export const metadata = { title: "How it works" };

export default function HowItWorks() {
  return (
    <section className="section">
      <div className="container prose">
        <div className="eyebrow">How it works</div>
        <h1>From your folios to your dashboard</h1>
        <p className="muted">Here&apos;s what happens behind the scenes when you sign in, and how we keep your data accurate and private.</p>

        <h2>1. Secure sign-in</h2>
        <p>
          You sign in with your email and password, then a one-time code. Sessions expire after 30 minutes of inactivity and you can sign out
          at any time.
        </p>

        <h2>2. Your accounts only</h2>
        <p>
          Each login is linked to your investor records only after verification. Every request is checked on our servers against that link,
          so no one can view another investor&apos;s portfolio.
        </p>

        <h2>3. Data from official sources</h2>
        <p>
          Holdings, transactions and SIP details come from approved integrations with the registrars and platforms (such as CAMS, KFintech,
          MF Central, NSE and BSE) as they are enabled. Every screen shows when the data was last verified. If a source is unavailable we
          tell you, rather than showing figures that might be out of date.
        </p>

        <h2>4. The assistant</h2>
        <ul>
          <li>Answers general questions about mutual funds and how the portal works.</li>
          <li>Looks up your own portfolio, transactions and SIPs through the same secure checks as the dashboard.</li>
          <li>Never places, changes or cancels transactions, and doesn&apos;t give personalised investment advice.</li>
          <li>Drafts a support request when something needs a person; nothing is sent until you confirm.</li>
        </ul>

        <h2>5. How figures are calculated</h2>
        <ul>
          <li>
            <b>Current value</b> — value reported by the source; otherwise units × latest NAV.
          </li>
          <li>
            <b>Invested amount</b> — net cash invested: purchases, SIP instalments and switch-ins, minus redemptions and switch-outs.
          </li>
          <li>
            <b>Gain/loss</b> — current value minus invested amount.
          </li>
          <li>
            <b>XIRR</b> — annualised return based on the dates and amounts of your successful transactions.
          </li>
        </ul>
      </div>
    </section>
  );
}
