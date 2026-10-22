import { ARN, BRAND_NAME } from "@/lib/config";

export const metadata = { title: "About" };

export default function About() {
  return (
    <section className="section">
      <div className="container">
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="prose">
            <div className="eyebrow">About us</div>
            <h1>Clear, patient help with your mutual funds</h1>
            <p>
              {BRAND_NAME} is an AMFI-registered mutual fund distributor ({ARN}). We work with individuals and families to set up SIPs, invest
              lump sums and keep their investments in good order over the years.
            </p>
            <p>
              We believe investors should always know what they own, what it&apos;s worth and where the numbers come from. That&apos;s why our
              portal shows the source and time of every figure, and why a real person is always one click away.
            </p>
            <h2>Our commitments</h2>
            <ul>
              <li>Scheme documents shared before every investment.</li>
              <li>Transparent disclosure of commissions we receive.</li>
              <li>Your data used only for servicing your investments, with your consent.</li>
              <li>Grievances acknowledged within one working day.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Registration details</h3>
            <div className="defs" style={{ fontSize: "0.92rem" }}>
              <dl>
                <dt>Entity</dt>
                <dd>{BRAND_NAME}</dd>
                <dt>AMFI ARN</dt>
                <dd>{ARN}</dd>
                <dt>Category</dt>
                <dd>Mutual Fund Distributor</dd>
                <dt>Platforms</dt>
                <dd>KFintech, CAMS, NSE MF Invest, BSE StAR MF</dd>
              </dl>
            </div>
            <p className="hint" style={{ marginTop: 14 }}>
              Replace these placeholders with your registered details before launch.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
