import { Dashboard } from "@/components/Dashboard";
import { HouseControlBar } from "@/components/HouseControlBar";
import { getDataset } from "@/lib/data";
import { getViewer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [data, viewer, params] = await Promise.all([getDataset(), getViewer(), searchParams]);
  const raceParam = params.race;
  const initialRaceId = typeof raceParam === "string" ? raceParam : null;
  const unverifiedSeats = data.seats.filter((s) => s.needs_review).length;

  return (
    <div className="grid gap-4 pt-4">
      <HouseControlBar seats={data.seats} races={data.races} />
      {data.source === "static" && (
        <p className="text-xs text-text-2 -mt-2">
          Showing the bundled seed data. Seat holders come from the congress-legislators dataset and nominees from Wikipedia, both checked Sept 2,
          2026. {unverifiedSeats} seats and every score are still flagged for review. Connect Supabase to edit.
        </p>
      )}
      <Dashboard data={data} canEdit={viewer.canEdit} initialRaceId={initialRaceId} />
    </div>
  );
}
