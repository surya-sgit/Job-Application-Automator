"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Shows the signed-in user's email + logout, or a login link. Hidden when accounts aren't enabled (no DATABASE_URL). */
export default function AuthStatus() {
  const router = useRouter();
  const [state, setState] = useState<{ email: string | null; accountsEnabled: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setState({ email: d.user?.email ?? null, accountsEnabled: d.accountsEnabled }))
      .catch(() => setState({ email: null, accountsEnabled: false }));
  }, []);

  if (!state || !state.accountsEnabled) return null;

  if (!state.email) {
    return (
      <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm hover:bg-slate-100">
        Log in
      </Link>
    );
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">{state.email}</span>
      <button onClick={logout} className="rounded-lg px-3 py-1.5 hover:bg-slate-100">
        Log out
      </button>
    </div>
  );
}
