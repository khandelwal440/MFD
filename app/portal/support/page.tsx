import { requireUser } from "@/lib/auth/guard";
import { listSupportCases, SUPPORT_CATEGORIES } from "@/lib/services/support";
import { dateTimeLabel } from "@/lib/format";
import SupportForm from "./SupportForm";

export const metadata = { title: "Support" };

export default async function Support() {
  const { user } = await requireUser("investor");
  const cases = listSupportCases(user.id);
  const label = (id: string) => SUPPORT_CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <>
      <div className="page-head">
        <h1>Support</h1>
        <span className="meta">We reply within one working day</span>
      </div>
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>New request</h3>
          <SupportForm categories={SUPPORT_CATEGORIES} />
        </div>
        <div className="card">
          <h3>Your requests</h3>
          {cases.length === 0 ? (
            <p className="muted">No requests yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.reference}>
                      <td className="scheme">
                        {c.reference}
                        <small>
                          {label(c.category)} · {dateTimeLabel(c.createdAt)}
                          {c.source === "assistant" ? " · via assistant" : ""}
                        </small>
                        <div className="muted" style={{ fontWeight: 400, fontSize: "0.85rem", marginTop: 4 }}>
                          {c.description}
                        </div>
                      </td>
                      <td>
                        <span className={`pill ${c.status}`}>{c.status.replace("_", " ")}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div className="card mt">
        <h3>Escalation</h3>
        <p className="muted">
          If you&apos;re not satisfied with our response, you can escalate to the AMC concerned or lodge a complaint on{" "}
          <a href="https://scores.sebi.gov.in/" target="_blank" rel="noopener noreferrer">
            SEBI SCORES
          </a>
          .
        </p>
      </div>
    </>
  );
}
