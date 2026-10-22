import { error, json, withAuth } from "@/lib/http";
import { syncAll } from "@/lib/sync/worker";
import { mockControls } from "@/lib/providers/mock";
import { audit } from "@/lib/audit";

const FAIL_MODES = ["none", "TEMP_UNAVAILABLE", "RATE_LIMITED", "AUTH_EXPIRED"] as const;

export const POST = withAuth(
  async ({ user }, req) => {
    const body = (await req.json().catch(() => ({}))) as { action?: unknown; failMode?: unknown };
    if (body.action === "run") {
      const jobs = await syncAll();
      audit({ actorType: "admin", actorId: user.id, action: "admin.sync.run", targetType: "sync", targetId: null, outcome: "success" });
      return json({ jobs: jobs.map((j) => ({ status: j.status, errorCode: j.errorCode, attempts: j.attempts })) });
    }
    if (body.action === "simulate") {
      const mode = FAIL_MODES.find((m) => m === body.failMode);
      if (!mode) return error("INVALID", "Unknown failure mode", 400);
      mockControls.failMode = mode;
      mockControls.failuresRemaining = mode === "none" ? 0 : -1;
      audit({ actorType: "admin", actorId: user.id, action: `admin.mock.${mode}`, targetType: "provider", targetId: "MOCK", outcome: "success" });
      return json({ failMode: mode });
    }
    return error("INVALID", "Unknown action", 400);
  },
  { role: "admin", mutating: true },
);
