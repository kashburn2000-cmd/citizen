import { ScoreMatrix } from "@/components/ScoreMatrix";
import { getDataset } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MatrixPage() {
  const data = await getDataset();
  return (
    <div className="grid gap-3 pt-4">
      <div>
        <h1 className="text-lg font-semibold">Scoring matrix</h1>
        <p className="text-sm text-text-2">Every scored candidate in a tracked race, by issue. Open a race to change scores.</p>
      </div>
      <ScoreMatrix data={data} />
    </div>
  );
}
