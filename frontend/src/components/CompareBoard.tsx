import { entryKey, isPlaceEntry } from "../lib/compare";
import { averageResponses } from "../lib/average";
import { modelById } from "../api/models";
import type { AromeResponse } from "../api/types";
import { useStore } from "../stores";
import { AverageCard } from "./AverageCard";
import { PinCard } from "./PinCard";

type Props = {
  /** Global day key selected in the main toolbar. */
  dayKey: string | null;
  /** Time of the hour selected in the main toolbar (sounding sync). */
  hourTime: string | null;
  view: "windgram" | "sounding";
  zMax: number;
  compact: boolean;
};

/** The compare board cards. The head (title and tools) lives in the header
 * (BoardHead); this is the scrolling list under the toolbar. */
export function CompareBoard({ dayKey, hourTime, view, zMax, compact }: Props) {
  const point = useStore((s) => s.point);
  const entries = useStore((s) => s.entries);
  const entryStates = useStore((s) => s.entryStates);
  const removeEntry = useStore((s) => s.removeEntry);
  const moveEntry = useStore((s) => s.moveEntry);
  const compareMode = useStore((s) => s.compareMode);
  const showAverage = useStore((s) => s.showAverage);

  // the averaged card is derived from the loaded model cards, never fetched
  let averaged: AromeResponse | null = null;
  let averagedCount = 0;
  if (compareMode === "model" && showAverage) {
    const ready = entries
      .map((e) => entryStates[entryKey(e)])
      .filter((st) => st?.status === "ready")
      .map((st) => (st as { status: "ready"; data: AromeResponse }).data);
    averagedCount = ready.length;
    averaged = averageResponses(ready);
  }

  return (
    <div className="board-list">
      {averaged ? (
        <AverageCard
          key="avg"
          data={averaged}
          count={averagedCount}
          dayKey={dayKey}
          hourTime={hourTime}
          view={view}
          zMax={zMax}
          compact={compact}
        />
      ) : null}
      {entries.map((entry, i) => {
        const key = entryKey(entry);
        const common = {
          state: entryStates[key],
          dayKey,
          hourTime,
          view,
          zMax,
          compact,
          onRemove: () => removeEntry(key),
          onMove: (delta: number) => moveEntry(key, delta),
          showUp: i > 0,
          showDown: i < entries.length - 1,
        };
        if (isPlaceEntry(entry)) {
          return <PinCard key={key} pin={entry} {...common} />;
        }
        // a model entry shows the current place as forecast by that model
        const model = modelById(entry.modelId);
        return (
          <PinCard
            key={key}
            pin={{ lat: point.lat, lon: point.lon, name: model.short }}
            {...common}
          />
        );
      })}
    </div>
  );
}
