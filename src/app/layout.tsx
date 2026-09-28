import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { appUrl } from "@/lib/env";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const APP_URL = appUrl();

/**
 * Self-hosted through next/font, so no request ever leaves for a font file and
 * there is no swap flash. Geist is a grotesque with a tall x-height, which is
 * what keeps the small labels in a dense tool readable.
 */
const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "FindMyTeammate: find teammates for hackathons at Amrita",
    template: "%s · FindMyTeammate",
  },
  description:
    "Find teammates for hackathons by skill, year and branch. Built for Amrita students.",
  keywords: [
    "hackathon teammates",
    "find a team",
    "hackathon team builder",
    "Amrita",
    "student developers",
  ],
  openGraph: {
    title: "FindMyTeammate",
    description:
      "Find teammates for hackathons by skill, year and branch.",
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
    { media: "(prefers-color-scheme: dark)", color: "#101216" },
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
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-box focus:bg-brand-fill focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
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
