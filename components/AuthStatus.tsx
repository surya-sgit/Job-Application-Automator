"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const APP_LINKS = [
  { href: "/", label: "Tailor" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

/**
 * Auth-aware nav: app links + email/logout when signed in (or when accounts
 * are disabled in local mode), Log in + Sign up buttons when signed out.
 */
export default function AuthStatus() {
  const router = useRouter();
  const [state, setState] = useState<{ email: string | null; accountsEnabled: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setState({ email: d.user?.email ?? null, accountsEnabled: d.accountsEnabled }))
      .catch(() => setState({ email: null, accountsEnabled: false }));
  }, []);

  if (!state) return null;

  const signedIn = !state.accountsEnabled || !!state.email;

  if (!signedIn) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link href="/login" className="rounded-lg px-3 py-1.5 hover:bg-slate-100">
          Log in
        </Link>
        <Link href="/signup" className="btn-primary px-3 py-1.5 text-sm">
          Sign up
        </Link>
      </div>
    );
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {APP_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 hover:bg-slate-100">
          {l.label}
        </Link>
      ))}
      {state.accountsEnabled && state.email && (
        <>
          <span className="ml-2 hidden text-slate-400 sm:inline">{state.email}</span>
          <button onClick={logout} className="rounded-lg px-3 py-1.5 hover:bg-slate-100">
            Log out
          </button>
        </>
      )}
    </div>
  );
}
