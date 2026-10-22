import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db/store";
import { listProviders } from "@/lib/providers/registry";
import { mockControls } from "@/lib/providers/mock";
import { lastJob } from "@/lib/sync/worker";
import { SUPPORT_CATEGORIES } from "@/lib/services/support";
import { aiEnabled, AI_MODEL } from "@/lib/config";
import { dateTimeLabel } from "@/lib/format";
import { audit } from "@/lib/audit";
import AdminActions from "./AdminActions";

export const metadata = { title: "Operations" };

export default async function AdminHome() {
  const { user } = await requireUser("admin");
  audit({ actorType: "admin", actorId: user.id, action: "admin.view.dashboard", targetType: null, targetId: null, outcome: "success" });
  const store = db();
  const accounts = store.investorAccounts;
  const userName = (id: string) => store.users.find((u) => u.id === id)?.displayName ?? "—";
  const jobs = [...store.syncJobs].reverse().slice(0, 15);
  const cases = [...store.supportCases].reverse();
  const leads = [...store.leads].reverse();
  const events = [...store.auditEvents].reverse().slice(0, 25);
  const failed24h = store.syncJobs.filter((j) => j.status === "failed" && Date.now() - Date.parse(j.startedAt) < 86_400_000).length;

  return (
    <>
      <div className="page-head">
        <h1>Operations</h1>
        <span className="meta">Sync health, support cases and audit trail</span>
      </div>

      <div className="grid grid-4">
        <div className="card stat">
          <div className="label">Linked accounts</div>
          <div className="value">{accounts.length}</div>
        </div>
        <div className="card stat">
          <div className="label">Open cases</div>
          <div className="value">{cases.filter((c) => c.status !== "resolved").length}</div>
        </div>
        <div className="card stat">
          <div className="label">Failed syncs (24h)</div>
          <div className={`value ${failed24h ? "neg" : ""}`}>{failed24h}</div>
        </div>
        <div className="card stat">
          <div className="label">Assistant</div>
          <div className="value" style={{ fontSize: "1.05rem", marginTop: 10 }}>
            {aiEnabled() ? AI_MODEL : "Offline (no API key)"}
          </div>
        </div>
      </div>

      <div className="grid grid-2 mt" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>Provider integrations</h3>
          <table>
            <tbody>
              {listProviders().map((p) => (
                <tr key={p.id}>
                  <td className="scheme">
                    {p.label}
                    <small>{p.id}</small>
                  </td>
                  <td>
                    <span className={`pill ${p.enabled ? "success" : "neutral"}`}>{p.enabled ? "enabled" : "awaiting approval"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Sync controls</h3>
          <AdminActions failMode={mockControls.failMode} />
        </div>
      </div>

      <div className="card mt">
        <h3>Account sync status</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Investor</th>
                <th>Provider</th>
                <th>Last success</th>
                <th>Latest attempt</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const ok = lastJob(a.id, "success");
                const latest = lastJob(a.id);
                return (
                  <tr key={a.id}>
                    <td>{userName(a.userId)}</td>
                    <td>{a.provider}</td>
                    <td>{ok ? dateTimeLabel(ok.completedAt) : "never"}</td>
                    <td>
                      {latest ? (
                        <>
                          <span className={`pill ${latest.status}`}>{latest.status}</span> {latest.errorCode && <code>{latest.errorCode}</code>}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt">
        <h3>Recent sync jobs</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Started</th>
                <th>Provider</th>
                <th>Status</th>
                <th className="num">Attempts</th>
                <th className="num">Records</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No syncs yet — they run when an investor opens the dashboard, or with “Run sync now”.
                  </td>
                </tr>
              )}
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>{dateTimeLabel(j.startedAt)}</td>
                  <td>{j.provider}</td>
                  <td>
                    <span className={`pill ${j.status}`}>{j.status}</span>
                  </td>
                  <td className="num">{j.attempts}</td>
                  <td className="num">{j.recordCount}</td>
                  <td>{j.errorCode ? <code>{j.errorCode}</code> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-2 mt" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>Support cases</h3>
          {cases.length === 0 ? (
            <p className="muted">No cases.</p>
          ) : (
            <table>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="scheme">
                      {c.reference} · {userName(c.userId)}
                      <small>
                        {SUPPORT_CATEGORIES.find((x) => x.id === c.category)?.label} · {dateTimeLabel(c.createdAt)} · {c.source}
                      </small>
                      <div className="muted" style={{ fontWeight: 400, fontSize: "0.85rem", marginTop: 4 }}>
                        {c.description}
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${c.status}`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>Website enquiries</h3>
          {leads.length === 0 ? (
            <p className="muted">No enquiries.</p>
          ) : (
            <table>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td className="scheme">
                      {l.name} · {l.contact}
                      <small>
                        {l.topic.replace("_", " ")} · {dateTimeLabel(l.createdAt)}
                      </small>
                      {l.message && (
                        <div className="muted" style={{ fontWeight: 400, fontSize: "0.85rem", marginTop: 4 }}>
                          {l.message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card mt">
        <h3>Audit trail</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dateTimeLabel(e.timestamp)}</td>
                  <td>
                    {e.actorType}
                    {e.actorId ? ` · ${userName(e.actorId)}` : ""}
                  </td>
                  <td>
                    <code>{e.action}</code>
                  </td>
                  <td>
                    <span className={`pill ${e.outcome}`}>{e.outcome}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
