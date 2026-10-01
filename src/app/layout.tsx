import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const displaySerif = Instrument_Serif({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const description =
  "RepoInsight turns public GitHub activity into an evidence-backed engineering report: maintenance, collaboration, releases, issues and pull requests, with the evidence behind every number.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RepoInsight — Understand a GitHub repository before you depend on it",
    template: "%s — RepoInsight",
  },
  description,
  applicationName: "RepoInsight",
  authors: [{ name: "Gati Varshney", url: "https://gativarshney.github.io/" }],
  keywords: ["GitHub", "repository analysis", "open source", "engineering report"],
  openGraph: {
    type: "website",
    siteName: "RepoInsight",
    title: "RepoInsight — Understand a GitHub repository before you depend on it",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "RepoInsight",
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
  ],
};

const themeScript = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${displaySerif.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="bg-ink text-bg sr-only z-50 rounded px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
