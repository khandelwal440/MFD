import Link from "next/link";
import { ARN, BRAND_NAME } from "@/lib/config";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">Mutual fund distribution · {ARN}</div>
          <h1>Your mutual funds, in one clear view — with a person behind every answer.</h1>
          <p className="lead">
            {BRAND_NAME} helps you start SIPs, keep track of your portfolio and get quick, accurate help on your account. Sign in to see your
            holdings, transactions and SIPs, or ask our assistant.
          </p>
          <div className="actions">
            <Link href="/login" className="btn btn-accent">
              Investor login
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              Talk to us
            </Link>
          </div>
          <div className="hero-badges">
            <span>✓ Read-only, secure dashboard</span>
            <span>✓ Data timestamped from official sources</span>
            <span>✓ Human support when you need it</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">What you get</div>
          <h2>Everything about your investments, without the paperwork</h2>
          <div className="grid grid-3 mt">
            <div className="card">
              <div className="icon-dot">📊</div>
              <h3>Portfolio dashboard</h3>
              <p className="muted">Current value, amount invested, gain/loss and XIRR — each with the date the data was last verified.</p>
            </div>
            <div className="card">
              <div className="icon-dot">🔁</div>
              <h3>SIPs &amp; transactions</h3>
              <p className="muted">See every SIP mandate, its next due date and instalment status, plus your full transaction history.</p>
            </div>
            <div className="card">
              <div className="icon-dot">💬</div>
              <h3>AI assistant</h3>
              <p className="muted">Ask “How are my funds doing?” or “When is my next SIP?” and get an answer from your own records.</p>
            </div>
            <div className="card">
              <div className="icon-dot">🛟</div>
              <h3>Support requests</h3>
              <p className="muted">Something looks off? Raise a request in a few taps and track it until it&apos;s resolved.</p>
            </div>
            <div className="card">
              <div className="icon-dot">🔒</div>
              <h3>Private by design</h3>
              <p className="muted">Two-step sign-in, and you only ever see your own linked accounts. We never ask for your bank PIN or OTPs.</p>
            </div>
            <div className="card">
              <div className="icon-dot">🧭</div>
              <h3>Help choosing schemes</h3>
              <p className="muted">Speak with our team about schemes that match your goals, with all scheme documents shared up front.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="eyebrow">Getting started</div>
          <h2>Three steps to your online portfolio</h2>
          <div className="grid grid-3 steps mt">
            <div className="card">
              <h3>Complete KYC &amp; invest</h3>
              <p className="muted">Invest through us with your KYC-verified details. We map your folios to your portal login.</p>
            </div>
            <div className="card">
              <h3>Verify and consent</h3>
              <p className="muted">Confirm your identity and agree to how your portfolio data is shown in the portal.</p>
            </div>
            <div className="card">
              <h3>Sign in anytime</h3>
              <p className="muted">Log in with your email, password and a one-time code to see your dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2" style={{ alignItems: "center" }}>
          <div>
            <h2>Already investing with us?</h2>
            <p className="muted">Sign in to see your portfolio, or contact us if you need your portal access set up.</p>
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
            <Link href="/contact" className="btn btn-ghost">
              Request access
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
