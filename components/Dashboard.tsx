"use client";

import { useEffect, useMemo, useState } from "react";
import { HouseCartogram, type CartogramLayout } from "./HouseCartogram";
import { DistrictMap, type DistrictTopology } from "./DistrictMap";
import { StateMap, type StatesLayout } from "./StateMap";
import { RacePanel } from "./RacePanel";
import { RaceList } from "./RaceList";
import { projectHouse } from "@/lib/scoring";
import { buildRaceViews } from "@/lib/view";
import type { Dataset, Office } from "@/lib/types";

interface Props {
  data: Dataset;
  canEdit: boolean;
  initialRaceId?: string | null;
}

const VIEWS: Array<{ key: Office; label: string }> = [
  { key: "house", label: "House" },
  { key: "senate", label: "Senate" },
  { key: "governor", label: "Governors" },
];

export function Dashboard({ data, canEdit, initialRaceId = null }: Props) {
  const [view, setView] = useState<Office>("house");
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(initialRaceId);
  const [showProjection, setShowProjection] = useState(false);
  const [dimUntracked, setDimUntracked] = useState(false);
  const [houseMode, setHouseMode] = useState<"hex" | "geo">("hex");
  const [cartogram, setCartogram] = useState<CartogramLayout | null>(null);
  const [districts, setDistricts] = useState<DistrictTopology | null>(null);
  const [statesLayout, setStatesLayout] = useState<StatesLayout | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/house-cartogram.json")
      .then((r) => r.json())
      .then((j: CartogramLayout) => !cancelled && setCartogram(j))
      .catch(() => {});
    fetch("/geo/states-albers.json")
      .then((r) => r.json())
      .then((j: StatesLayout) => !cancelled && setStatesLayout(j))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (houseMode !== "geo" || districts) return;
    let cancelled = false;
    fetch("/geo/districts-albers.json")
      .then((r) => r.json())
      .then((j: DistrictTopology) => !cancelled && setDistricts(j))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [houseMode, districts]);

  const raceViews = useMemo(() => buildRaceViews(data), [data]);
  const tracked = useMemo(() => raceViews.filter((r) => r.tracked), [raceViews]);
  const visible = useMemo(() => tracked.filter((r) => r.office === view), [tracked, view]);
  const projection = useMemo(() => (showProjection ? projectHouse(data.seats, data.races).bySeat : null), [showProjection, data.seats, data.races]);
  const selected = raceViews.find((r) => r.id === selectedRaceId) ?? null;

  const switchView = (next: Office) => {
    setView(next);
    if (selected && selected.office !== next) setSelectedRaceId(null);
  };

  const selectRace = (id: string | null) => {
    setSelectedRaceId(id);
    if (id) {
      const r = raceViews.find((x) => x.id === id);
      if (r && r.office !== view) setView(r.office);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      <section className="rounded-lg border border-border bg-surface p-3 grid gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="inline-flex rounded-md border border-border overflow-hidden" role="tablist">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                role="tab"
                aria-selected={view === v.key}
                onClick={() => switchView(v.key)}
                className={`px-3 py-1 ${view === v.key ? "bg-text text-surface" : "hover:bg-surface-2 text-text-2"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {view === "house" && (
            <>
              <div className="inline-flex rounded-md border border-border overflow-hidden text-xs" role="tablist" aria-label="House map style">
                {(["hex", "geo"] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={houseMode === m}
                    onClick={() => setHouseMode(m)}
                    className={`px-2 py-1 ${houseMode === m ? "bg-surface-2 text-text" : "text-text-2"}`}
                  >
                    {m === "hex" ? "One hex per seat" : "Geographic"}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-1.5 text-text-2">
                <input type="checkbox" checked={showProjection} onChange={(e) => setShowProjection(e.target.checked)} />
                Projected
              </label>
              <label className="inline-flex items-center gap-1.5 text-text-2">
                <input type="checkbox" checked={dimUntracked} onChange={(e) => setDimUntracked(e.target.checked)} />
                Highlight tracked
              </label>
            </>
          )}
          <span className="ml-auto text-xs text-text-3">
            {view === "house"
              ? houseMode === "hex"
                ? "One hexagon per seat. Outlined seats have a tracked race. Scroll to zoom."
                : "Census 119th Congress boundaries; states that redrew for 2026 will differ. Scroll to zoom."
              : "Pins mark tracked races. Click to open."}
          </span>
        </div>

        {view === "house" && houseMode === "geo" && districts && (
          <DistrictMap
            topo={districts}
            seats={data.seats}
            races={raceViews}
            projection={projection}
            selectedRaceId={selectedRaceId}
            onSelectRace={selectRace}
            dimUntracked={dimUntracked}
          />
        )}
        {view === "house" && houseMode === "hex" && cartogram && (
          <HouseCartogram
            layout={cartogram}
            seats={data.seats}
            races={raceViews}
            projection={projection}
            selectedRaceId={selectedRaceId}
            onSelectRace={selectRace}
            dimUntracked={dimUntracked}
          />
        )}
        {view !== "house" && statesLayout && (
          <StateMap layout={statesLayout} races={raceViews} office={view} selectedRaceId={selectedRaceId} onSelectRace={selectRace} />
        )}
        {((view === "house" && houseMode === "hex" && !cartogram) ||
          (view === "house" && houseMode === "geo" && !districts) ||
          (view !== "house" && !statesLayout)) && (
          <div className="aspect-[975/610] flex items-center justify-center text-sm text-text-3">Loading map…</div>
        )}
      </section>

      <aside className="rounded-lg border border-border bg-surface p-3 min-w-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
        {selected ? (
          <RacePanel race={selected} issues={data.issues} canEdit={canEdit} onClose={() => setSelectedRaceId(null)} />
        ) : (
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">
                Tracked {VIEWS.find((v) => v.key === view)?.label.toLowerCase()} races
              </h3>
              <span className="text-xs text-text-3">{visible.length}</span>
            </div>
            <RaceList races={visible} selectedRaceId={selectedRaceId} onSelectRace={selectRace} />
          </div>
        )}
      </aside>
    </div>
  );
}
