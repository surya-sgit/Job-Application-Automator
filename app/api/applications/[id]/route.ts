import { NextRequest, NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { readApplications, writeApplications, deleteApplication } from "@/lib/store";
import { z } from "zod";

export const runtime = "nodejs";

const UpdateAppSchema = z.object({
  status: z.enum(["Draft", "Applied", "Online Assessment", "Interview", "Offer", "Rejected"]).optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    
    const body = UpdateAppSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const apps = await readApplications(userId);
    const index = apps.findIndex((a) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    // Update fields
    const updated = { ...apps[index] };
    if (body.data.status) updated.status = body.data.status;
    if (body.data.followUpDate !== undefined) updated.followUpDate = body.data.followUpDate;
    if (body.data.notes !== undefined) updated.notes = body.data.notes;

    apps[index] = updated;
    await writeApplications(userId, apps);

    return NextResponse.json({ application: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await deleteApplication(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
