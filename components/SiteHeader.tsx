"use client";

import Link from "next/link";
import { useState } from "react";
import { BRAND_NAME } from "@/lib/brand";

const LINKS = [
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="logo" style={light ? { color: "#fff" } : undefined}>
      <span className="logo-mark" aria-hidden>
        {BRAND_NAME.charAt(0)}
      </span>
      {BRAND_NAME}
    </Link>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <button className="nav-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
          ☰<span className="skip">Menu</span>
        </button>
        <nav id="site-nav" className="nav" data-open={open} aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="btn btn-primary btn-sm" style={{ color: "#fff" }}>
            Investor login
          </Link>
        </nav>
      </div>
    </header>
  );
}
