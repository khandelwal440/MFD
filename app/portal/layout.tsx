import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/session";
import { BRAND_NAME } from "@/lib/config";
import { NavLinks, LogoutButton } from "@/components/PortalNav";
import ChatWidget from "@/components/ChatWidget";
import { aiEnabled } from "@/lib/config";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/portal", label: "Overview", icon: "◎" },
  { href: "/portal/holdings", label: "Holdings", icon: "▤" },
  { href: "/portal/transactions", label: "Transactions", icon: "⇄" },
  { href: "/portal/sips", label: "SIPs", icon: "↻" },
  { href: "/portal/support", label: "Support", icon: "?" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (auth.user.role !== "investor") redirect("/admin");
  return (
    <div className="portal">
      <aside className="sidebar">
        <a href="/" className="logo">
          <span className="logo-mark">{BRAND_NAME.charAt(0)}</span>
          {BRAND_NAME}
        </a>
        <NavLinks links={LINKS} />
        <div className="side-foot">
          Read-only portal. Transactions are handled by our team.
        </div>
      </aside>
      <div className="portal-main">
        <header className="topbar">
          <span className="muted" style={{ fontSize: "0.9rem" }}>
            Investor portal
          </span>
          <div className="who">
            {auth.user.displayName}
            <small>{auth.user.loginSubject}</small>
          </div>
          <LogoutButton />
        </header>
        <main id="main" className="page">
          {children}
        </main>
      </div>
      <ChatWidget firstName={auth.user.displayName.split(" ")[0]} aiMode={aiEnabled() ? "claude" : "offline"} />
    </div>
  );
}
