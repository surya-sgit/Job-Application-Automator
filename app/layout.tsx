import type { Metadata } from "next";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Application Automator",
  description: "Tailor your resume to any JD and email it to HR in one click.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
                <span className="text-xl">🎯</span> Job Application Automator
              </Link>
              <nav className="flex items-center gap-1 text-sm">
                <AuthStatus />
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
