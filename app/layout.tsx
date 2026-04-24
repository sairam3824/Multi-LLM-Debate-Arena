import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-LLM Debate Arena",
  description: "Pit two LLMs against each other, stream every round live, and let a judge score the exchange."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="relative isolate">
          <div className="absolute inset-0 -z-10 bg-arena-grid bg-[size:36px_36px] opacity-[0.04]" />
          <header className="border-b border-border/60 bg-white/70 backdrop-blur-xl">
            <div className="container flex items-center justify-between py-5">
              <Link href="/" className="text-lg font-semibold tracking-tight text-slate-950">
                Multi-LLM Debate Arena
              </Link>
              <nav className="flex items-center gap-5 text-sm text-muted-foreground">
                <Link href="/">Arena</Link>
                <Link href="/history">History</Link>
              </nav>
            </div>
          </header>
          <main className="container py-8 md:py-12">{children}</main>
        </div>
      </body>
    </html>
  );
}
