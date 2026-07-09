import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { USE_DB } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  if (!USE_DB) return NextResponse.json({ user: null, accountsEnabled: false });
  const user = await getCurrentUser();
  return NextResponse.json({ user, accountsEnabled: true });
}
