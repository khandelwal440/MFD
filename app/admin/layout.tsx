import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/session";
import { BRAND_NAME } from "@/lib/config";
import { NavLinks, LogoutButton } from "@/components/PortalNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (auth.user.role !== "admin") redirect("/portal");
  return (
    <div className="portal">
      <aside className="sidebar">
        <a href="/" className="logo">
          <span className="logo-mark">{BRAND_NAME.charAt(0)}</span>
          Operations
        </a>
        <NavLinks links={[{ href: "/admin", label: "Health & cases", icon: "◎" }]} />
        <div className="side-foot">Admin access is audited. No investor holdings are shown here.</div>
      </aside>
      <div className="portal-main">
        <header className="topbar">
          <span className="muted" style={{ fontSize: "0.9rem" }}>
            Distributor admin
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
    </div>
  );
}
