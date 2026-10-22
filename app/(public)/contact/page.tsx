import ContactForm from "./ContactForm";

export const metadata = { title: "Contact & support" };

export default function Contact() {
  return (
    <section className="section">
      <div className="container grid grid-2" style={{ alignItems: "start" }}>
        <div>
          <div className="eyebrow">Contact</div>
          <h1>Talk to us</h1>
          <p className="muted">Questions about investing, portal access or an existing investment — send us a note and we&apos;ll reply within one working day.</p>
          <div className="card mt">
            <h3>Reach us directly</h3>
            <p className="muted" style={{ marginBottom: 8 }}>
              Email: support@yourdomain.example
              <br />
              Phone: +91 00000 00000 (Mon–Sat, 10am–6pm IST)
              <br />
              Office: Your registered address
            </p>
            <p className="hint">Placeholders — replace with your registered contact details.</p>
          </div>
          <div className="card mt">
            <h3>Grievance redressal</h3>
            <p className="muted">
              Raise a complaint here or from the portal&apos;s Support page. We acknowledge within one working day and aim to resolve within 7
              working days. If unresolved, you can escalate to the AMC concerned or via{" "}
              <a href="https://scores.sebi.gov.in/" target="_blank" rel="noopener noreferrer">
                SEBI SCORES
              </a>
              .
            </p>
          </div>
        </div>
        <div className="card">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
