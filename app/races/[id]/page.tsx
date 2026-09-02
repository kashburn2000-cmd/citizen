import Link from "next/link";
import { notFound } from "next/navigation";
import { RacePanel } from "@/components/RacePanel";
import { getDataset } from "@/lib/data";
import { getViewer } from "@/lib/supabase/server";
import { buildRaceViews } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function RacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, viewer] = await Promise.all([getDataset(), getViewer()]);
  const race = buildRaceViews(data).find((r) => r.id === id);
  if (!race) notFound();
  return (
    <div className="max-w-3xl pt-4 grid gap-3">
      <Link href={`/?race=${race.id}`} className="text-xs text-text-2 underline">
        Show on map
      </Link>
      <RacePanel race={race} issues={data.issues} canEdit={viewer.canEdit} />
    </div>
  );
}
