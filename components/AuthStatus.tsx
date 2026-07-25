"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const APP_LINKS = [
  { href: "/", label: "Tailor" },
  { href: "/tracker", label: "Tracker" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

export default function AuthStatus() {
  const router = useRouter();
  const pathname = usePathname();
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
        <Link href="/login" className="rounded-xl px-4 py-2 font-medium text-slate-300 hover:text-white transition-colors">
          Log in
        </Link>
        <Link href="/signup" className="btn-primary px-4 py-2 text-sm">
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
    <div className="flex items-center gap-1 md:gap-2 text-sm font-medium">
      <div className="flex bg-dark-900/40 border border-white/10 rounded-xl p-1 backdrop-blur-md">
        {APP_LINKS.map((l) => {
          const isActive = pathname === l.href;
          return (
            <Link 
              key={l.href} 
              href={l.href} 
              className={`relative px-4 py-2 rounded-lg transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-tab"
                  className="absolute inset-0 bg-white/10 rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{l.label}</span>
            </Link>
          );
        })}
      </div>
      
      {state.accountsEnabled && state.email && (
        <div className="flex items-center gap-3 ml-2 pl-4 border-l border-white/10">
          <span className="hidden text-xs text-slate-400 sm:inline truncate max-w-[150px]" title={state.email}>
            {state.email}
          </span>
          <button onClick={logout} className="rounded-xl px-3 py-2 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors">
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
