import { IssueList } from "@/components/IssueList";
import { getDataset } from "@/lib/data";
import { getViewer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const [data, viewer] = await Promise.all([getDataset(), getViewer()]);
  return (
    <div className="grid gap-3 pt-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold">Scoring rubric</h1>
        <p className="text-sm text-text-2">
          Each candidate gets 0 to 4 per issue. The total is the weighted average over the issues that have a score, scaled to 100.
          {viewer.canEdit ? " Change a weight and every score updates." : " Sign in as an editor to change weights."}
        </p>
      </div>
      <IssueList issues={data.issues} canEdit={viewer.canEdit} />
    </div>
  );
}
