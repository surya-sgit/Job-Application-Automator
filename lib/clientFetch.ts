"use client";

/**
 * fetch wrapper for client components: turns every failure mode into a
 * thrown Error with a readable message (network failure, non-JSON body,
 * non-ok status), and redirects to login on 401 so an expired session never
 * leaves a page hanging.
 */
export async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Network error — check your connection and try again.");
  }

  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new Error("Not signed in — redirecting to login…");
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Unexpected server response (${res.status}). Try again.`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status}).`);
  }
  return data as T;
}
