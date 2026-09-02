import { Dashboard } from "@/components/Dashboard";
import { HouseControlBar } from "@/components/HouseControlBar";
import { Leaderboard } from "@/components/Leaderboard";
import { getDataset } from "@/lib/data";
import { getViewer } from "@/lib/supabase/server";
import { buildRaceViews } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [data, viewer, params] = await Promise.all([getDataset(), getViewer(), searchParams]);
  const raceParam = params.race;
  const initialRaceId = typeof raceParam === "string" ? raceParam : null;

  return (
    <div className="grid gap-2">
      <HouseControlBar seats={data.seats} races={data.races} />
      {data.source === "static" && (
        <p className="text-[13px] text-text-3 -mt-2 pb-2">
          Preview with bundled data. Seat holders come from the congress-legislators dataset and nominees from Wikipedia, both checked Sept 2, 2026.
        </p>
      )}
      <Dashboard data={data} canEdit={viewer.canEdit} initialRaceId={initialRaceId} />
      <Leaderboard races={buildRaceViews(data)} />
    </div>
  );
}
