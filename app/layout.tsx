import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: `${BRAND_NAME} — Mutual Fund Distribution & Investor Services`, template: `%s · ${BRAND_NAME}` },
  description: `${BRAND_NAME} helps investors start, track and service their mutual fund investments, with a secure online portfolio dashboard and assistant.`,
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e3b5c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <a href="#main" className="skip">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
