import { IssueList } from "@/components/IssueList";
import { getDataset } from "@/lib/data";
import { getViewer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const [data, viewer] = await Promise.all([getDataset(), getViewer()]);
  return (
    <div className="grid gap-5 pt-8 max-w-[1040px]">
      <div className="grid gap-2">
        <div className="label text-rep text-[13px]">The rubric</div>
        <h1 className="display text-[44px] sm:text-[56px]">What progressive means here</h1>
        <p className="text-[17px] text-text-2 max-w-[640px]">
          Each candidate gets 0 to 4 per issue. The total is the weighted average over the issues that have a score, scaled to 100.
          {viewer.canEdit ? " Change a weight and every score updates." : " Sign in as an editor to change weights."}
        </p>
      </div>
      <IssueList issues={data.issues} canEdit={viewer.canEdit} />
    </div>
  );
}
