import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoInsight",
  description:
    "Turn a public GitHub repository into an evidence-backed engineering report.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
