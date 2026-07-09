"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login failed.");
      return;
    }
    router.push(params.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <div className="card space-y-4">
        <div>
          <h1 className="text-xl font-bold">🎯 Job Application Automator</h1>
          <p className="text-sm text-slate-500">Enter the app password to continue.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            className="input"
            type="password"
            placeholder="Password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || !password}>
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
