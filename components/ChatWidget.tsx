"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Draft {
  category: string;
  categoryLabel: string;
  description: string;
}

interface Msg {
  role: "user" | "assistant";
  text: string;
  tools?: string[];
  draft?: Draft | null;
  draftState?: "pending" | "submitting" | "submitted" | "dismissed";
  reference?: string;
}

const SUGGESTIONS = ["How is my portfolio doing?", "When is my next SIP?", "Show my recent transactions", "What is XIRR?"];

const TOOL_LABEL: Record<string, string> = {
  get_portfolio_summary: "portfolio summary",
  get_holdings: "holdings",
  get_transaction_history: "transactions",
  get_sip_details: "SIPs",
  get_statement_status: "statements",
  draft_support_request: "support draft",
};

// Minimal, safe markdown: bold, italics, bullet lists and pipe tables.
// Builds React elements, so model output can never inject HTML.
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? (
      <em key={i}>{p.slice(1, -1)}</em>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*[-•*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-•*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-•*]\s+/, ""));
      out.push(
        <ul key={i}>
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i++].trim().slice(1, -1).split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
      }
      out.push(
        <div className="table-wrap" key={i}>
          <table style={{ fontSize: "0.8rem" }}>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (ri === 0 ? <th key={ci}>{inline(c)}</th> : <td key={ci}>{inline(c)}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.trim()) out.push(<p key={i}>{inline(line.replace(/^#+\s*/, ""))}</p>);
    i++;
  }
  return <>{out}</>;
}

export default function ChatWidget({ firstName, aiMode }: { firstName: string; aiMode: "claude" | "offline" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error(data?.error?.message ?? "Something went wrong.");
      setMsgs((m) => [...m, { role: "assistant", text: data.reply, tools: data.toolsUsed, draft: data.supportDraft, draftState: data.supportDraft ? "pending" : undefined }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", text: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDraft(index: number) {
    const d = msgs[index].draft!;
    setMsgs((m) => m.map((x, i) => (i === index ? { ...x, draftState: "submitting" } : x)));
    const res = await fetch("/api/support-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: d.category, description: d.description, source: "assistant" }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setMsgs((m) => m.map((x, i) => (i === index ? { ...x, draftState: "submitted", reference: data.reference } : x)));
      router.refresh();
    } else {
      setMsgs((m) => m.map((x, i) => (i === index ? { ...x, draftState: "pending" } : x)));
      alert(data?.error?.message ?? "Couldn't submit the request.");
    }
  }

  async function reset() {
    await fetch("/api/chat", { method: "DELETE" });
    setMsgs([]);
  }

  if (!open) {
    return (
      <button className="btn btn-primary chat-fab" onClick={() => setOpen(true)} aria-label="Open assistant">
        💬 Ask the assistant
      </button>
    );
  }

  return (
    <section className="chat-panel" role="dialog" aria-label="Portfolio assistant">
      <div className="chat-head">
        <div>
          <div className="title">Portfolio assistant</div>
          <small>{aiMode === "claude" ? "AI · answers from your own records" : "Offline mode · answers from your own records"}</small>
        </div>
        <span className="spacer" />
        <button onClick={reset} title="Start a new conversation">
          New chat
        </button>
        <button onClick={() => setOpen(false)} aria-label="Close assistant">
          ✕
        </button>
      </div>
      <div className="chat-body" ref={bodyRef} aria-live="polite">
        {msgs.length === 0 && (
          <>
            <div className="msg assistant">
              <p>Hi {firstName} 👋 I can look up your portfolio, holdings, transactions and SIPs, explain mutual fund terms, or raise a support request.</p>
              <p className="hint">I can&apos;t place transactions or give investment advice.</p>
            </div>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        {msgs.map((m, i) => (
          <Fragment key={i}>
            <div className={`msg ${m.role}`}>
              {m.role === "assistant" ? <Rich text={m.text} /> : m.text}
              {m.tools && m.tools.length > 0 && <div className="tools">Checked: {[...new Set(m.tools.map((t) => TOOL_LABEL[t] ?? t))].join(", ")}</div>}
            </div>
            {m.draft && m.draftState !== "dismissed" && (
              <div className="draft">
                <b>Support request draft</b>
                <div className="hint" style={{ marginTop: 4 }}>
                  {m.draft.categoryLabel}
                </div>
                <div style={{ marginTop: 6 }}>{m.draft.description}</div>
                {m.draftState === "submitted" ? (
                  <div className="form-ok" style={{ margin: "10px 0 0" }}>
                    Submitted · {m.reference}
                  </div>
                ) : (
                  <div className="actions">
                    <button className="btn btn-primary btn-sm" disabled={m.draftState === "submitting"} onClick={() => confirmDraft(i)}>
                      {m.draftState === "submitting" ? "Submitting…" : "Confirm & submit"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setMsgs((x) => x.map((y, j) => (j === i ? { ...y, draftState: "dismissed" } : y)))}>
                      Discard
                    </button>
                  </div>
                )}
              </div>
            )}
          </Fragment>
        ))}
        {busy && <div className="msg assistant typing">Looking that up…</div>}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="skip">
          Message
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          value={input}
          maxLength={2000}
          placeholder="Ask about your investments…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button className="btn btn-primary" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
      <div className="chat-foot">General information only, not investment advice. Check key figures on your dashboard.</div>
    </section>
  );
}
