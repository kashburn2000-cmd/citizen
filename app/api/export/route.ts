import { NextResponse } from "next/server";
import { getDataset } from "@/lib/data";
import { getViewer } from "@/lib/supabase/server";
import { buildWorkbook, exportFilename } from "@/lib/export";

export const dynamic = "force-dynamic";

/** Editor-only: the whole dataset as an Excel workbook. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer.canEdit) {
    return NextResponse.json({ error: "Editors only. Sign in with an editor account to export." }, { status: viewer.userId ? 403 : 401 });
  }
  const data = await getDataset();
  const now = new Date();
  const buffer = await buildWorkbook(data, now).xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFilename(now)}"`,
      "Cache-Control": "no-store",
    },
  });
}
