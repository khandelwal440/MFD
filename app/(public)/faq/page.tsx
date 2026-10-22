export const metadata = { title: "FAQs" };

const FAQS = [
  { q: "How do I get access to the investor portal?", a: "If you invest through us, contact us to set up your login. We verify your identity and link your folios before your dashboard is switched on." },
  { q: "Can I buy or redeem funds in the portal?", a: "Not yet. The portal is read-only for now. Transactions will be added only after platform approval and full testing. Contact us to place requests in the meantime." },
  { q: "How current is the data I see?", a: "Each screen shows the time the data was last verified from its source. NAVs are published at the end of each business day, so values usually reflect the previous day's NAV." },
  { q: "Why does my dashboard say data may be out of date?", a: "That means we couldn't refresh from the source recently. You'll see the last verified figures with a warning. It usually resolves on its own; if not, raise a support request." },
  { q: "What is XIRR?", a: "XIRR is an annualised return that accounts for when each investment and withdrawal happened. It's the fairest way to measure SIP returns." },
  { q: "Is the AI assistant giving me investment advice?", a: "No. It explains concepts and your own figures. For advice on what to invest in, please talk to our team." },
  { q: "Will you ever ask for my OTP or bank PIN?", a: "Never. The portal's one-time code is only entered on our sign-in page. Don't share it with anyone, including our staff." },
  { q: "How do I raise a grievance?", a: "Use the Support page in the portal or our contact page. If you're not satisfied with our response, you can escalate to the AMC, or via SEBI SCORES." },
];

export default function Faq() {
  return (
    <section className="section">
      <div className="container prose">
        <div className="eyebrow">FAQs</div>
        <h1>Frequently asked questions</h1>
        <div className="mt">
          {FAQS.map((f) => (
            <details className="faq" key={f.q}>
              <summary>{f.q}</summary>
              <p className="muted" style={{ margin: 0 }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
