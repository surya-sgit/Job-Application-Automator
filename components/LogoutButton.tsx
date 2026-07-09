"use client";

import { useRouter } from "next/navigation";

/** Only meaningful when APP_PASSWORD is set on the server; harmless otherwise. */
export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={logout} className="rounded-lg px-3 py-1.5 text-sm hover:bg-slate-100">
      Log out
    </button>
  );
}
