"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string; icon: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Portal">
      {links.map((l) => {
        const active = l.href === path || (l.href !== "/portal" && l.href !== "/admin" && path.startsWith(l.href));
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            <span aria-hidden>{l.icon}</span> {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
