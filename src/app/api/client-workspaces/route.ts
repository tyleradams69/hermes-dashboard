import { NextResponse } from "next/server";
import type { ClientWorkspace } from "../../../lib/clientWorkspace";
import { createClientWorkspaceStore } from "../../../lib/clientWorkspaceStore";

export const dynamic = "force-dynamic";

function isClientWorkspace(value: Partial<ClientWorkspace> | null | undefined): value is ClientWorkspace {
  return Boolean(
    value?.id &&
      value.sourceLeadId &&
      value.name &&
      value.owner &&
      value.phase &&
      value.packageFit &&
      value.location &&
      value.nextDeliverable &&
      Array.isArray(value.assetChecklist) &&
      value.createdAt &&
      value.updatedAt
  );
}

export async function GET() {
  try {
    const workspaces = await createClientWorkspaceStore().listWorkspaces();
    return NextResponse.json({ ok: true, workspaces });
  } catch (error) {
    console.error("Client workspace load failed", error);
    return NextResponse.json({ ok: false, error: "Client workspaces could not load" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { workspace?: ClientWorkspace };

    if (!isClientWorkspace(body.workspace)) {
      return NextResponse.json({ ok: false, error: "workspace is required" }, { status: 400 });
    }

    const workspace = await createClientWorkspaceStore().upsertWorkspace({
      ...body.workspace,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, workspace }, { status: 201 });
  } catch (error) {
    console.error("Client workspace save failed", error);
    return NextResponse.json({ ok: false, error: "Client workspace could not be saved" }, { status: 500 });
  }
}
