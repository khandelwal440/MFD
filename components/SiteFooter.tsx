import Link from "next/link";
import { ARN, BRAND_NAME } from "@/lib/config";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            <strong style={{ color: "#fff", fontSize: "1.05rem" }}>{BRAND_NAME}</strong>
            <p style={{ marginTop: 8 }}>
              AMFI-registered Mutual Fund Distributor · {ARN}
              <br />
              We distribute mutual fund schemes and help investors with servicing. We are not an investment adviser.
            </p>
          </div>
          <div>
            <strong style={{ color: "#fff" }}>Investors</strong>
            <p style={{ marginTop: 8 }}>
              <Link href="/login">Investor login</Link>
              <br />
              <Link href="/how-it-works">How it works</Link>
              <br />
              <Link href="/faq">FAQs</Link>
              <br />
              <Link href="/contact">Support &amp; grievances</Link>
            </p>
          </div>
          <div>
            <strong style={{ color: "#fff" }}>Legal</strong>
            <p style={{ marginTop: 8 }}>
              <Link href="/disclosures">Disclosures</Link>
              <br />
              <Link href="/privacy">Privacy &amp; consent</Link>
              <br />
              <a href="https://www.amfiindia.com/" target="_blank" rel="noopener noreferrer">
                AMFI
              </a>{" "}
              ·{" "}
              <a href="https://www.sebi.gov.in/" target="_blank" rel="noopener noreferrer">
                SEBI
              </a>{" "}
              ·{" "}
              <a href="https://scores.sebi.gov.in/" target="_blank" rel="noopener noreferrer">
                SCORES
              </a>
            </p>
          </div>
        </div>
        <p className="risk">
          Mutual fund investments are subject to market risks. Read all scheme-related documents carefully before investing. Past performance
          is not indicative of future returns. © {new Date().getFullYear()} {BRAND_NAME}.
        </p>
      </div>
    </footer>
  );
}
