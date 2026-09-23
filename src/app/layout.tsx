import type { Metadata, Viewport } from "next";
import { appUrl } from "@/lib/env";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const APP_URL = appUrl();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "FindMyTeammate — find the right teammates for hackathons",
    template: "%s · FindMyTeammate",
  },
  description:
    "Find teammates for hackathons and competitions by skill, role, availability and verified track record. Build balanced teams for the exact event you want to attend.",
  keywords: [
    "hackathon teammates",
    "find a team",
    "hackathon team builder",
    "Smart India Hackathon",
    "student developers",
  ],
  openGraph: {
    title: "FindMyTeammate",
    description:
      "Find the right teammates for hackathons and competitions — by skill, role, availability and verified wins.",
    url: APP_URL,
    siteName: "FindMyTeammate",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "FindMyTeammate" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2373F4" },
    { media: "(prefers-color-scheme: dark)", color: "#070C15" },
  ],
};

/**
 * Applies the saved theme before first paint so there is no flash of the wrong
 * colour scheme. Falls back to the operating system preference.
 */
const themeScript = `
try {
  var saved = localStorage.getItem("fmt-theme");
  var dark = saved ? saved === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (dark) document.documentElement.classList.add("dark");
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
