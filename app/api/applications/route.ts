import { NextRequest, NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { readApplications, writeApplications, Application } from "@/lib/store";
import { randomUUID } from "crypto";
import { z } from "zod";

export const runtime = "nodejs";

const CreateAppSchema = z.object({
  companyName: z.string().min(1),
  jobTitle: z.string().min(1),
  status: z.enum(["Draft", "Applied", "Online Assessment", "Interview", "Offer", "Rejected"]),
  recruiterContact: z.string().optional(),
  resumeId: z.string().optional(),
  jdSnippet: z.string().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const apps = await readApplications(userId);
    return NextResponse.json({ applications: apps });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = CreateAppSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const apps = await readApplications(userId);
    const newApp: Application = {
      id: randomUUID(),
      companyName: body.data.companyName,
      jobTitle: body.data.jobTitle,
      status: body.data.status,
      dateApplied: new Date().toISOString(),
      recruiterContact: body.data.recruiterContact,
      resumeId: body.data.resumeId,
      jdSnippet: body.data.jdSnippet?.slice(0, 500),
    };
    
    apps.unshift(newApp);
    await writeApplications(userId, apps);

    return NextResponse.json({ application: newApp });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
