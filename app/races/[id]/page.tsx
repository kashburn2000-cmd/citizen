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
    <div className="max-w-[860px] pt-8 grid gap-4">
      <Link href={`/?race=${race.id}`} className="label text-[12px] underline underline-offset-4 decoration-2 justify-self-start">
        Show on map
      </Link>
      <div className="ink p-6 sm:p-8">
        <RacePanel race={race} issues={data.issues} canEdit={viewer.canEdit} />
      </div>
    </div>
  );
}
