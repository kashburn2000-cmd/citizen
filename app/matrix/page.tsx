import { ScoreMatrix } from "@/components/ScoreMatrix";
import { getDataset } from "@/lib/data";
import { getViewer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MatrixPage() {
  const [data, viewer] = await Promise.all([getDataset(), getViewer()]);
  return (
    <div className="grid gap-5 pt-8">
      <div className="grid gap-2">
        <div className="label text-rep text-[13px]">The matrix</div>
        <h1 className="display text-[44px] sm:text-[56px]">Every scored candidate, every issue</h1>
        <p className="text-[17px] text-text-2 max-w-[640px]">Sort by the total or by any single issue. Hover a cell for the evidence. Open a race to change a score.</p>
        {viewer.canEdit && (
          <a href="/api/export" className="btn btn-solid justify-self-start mt-2">
            Download everything as Excel
          </a>
        )}
      </div>
      <ScoreMatrix data={data} />
    </div>
  );
}
