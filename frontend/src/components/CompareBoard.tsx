import { useI18n } from "../i18nContext";
import { interpolate } from "../lib/i18n";
import { entryKey, isPlaceEntry } from "../lib/compare";
import { pinKey } from "../lib/pins";
import { modelById } from "../api/models";
import { useStore } from "../stores";
import { FavoritesMenu } from "./FavoritesMenu";
import { HistoryMenu } from "./HistoryMenu";
import { PinCard } from "./PinCard";
import { PlaceSearch } from "./PlaceSearch";

type Props = {
  /** Global day key selected in the main toolbar. */
  dayKey: string | null;
  /** Time of the hour selected in the main toolbar (sounding sync). */
  hourTime: string | null;
  view: "windgram" | "sounding";
  zMax: number;
  compact: boolean;
};

/** The compare board: the only component that subscribes to entryStates, so
 * an entry resolution does not re-render the rest of the app. */
export function CompareBoard({ dayKey, hourTime, view, zMax, compact }: Props) {
  const { t } = useI18n();
  const modelId = useStore((s) => s.modelId);
  const point = useStore((s) => s.point);
  const entries = useStore((s) => s.entries);
  const entryStates = useStore((s) => s.entryStates);
  const favs = useStore((s) => s.favs);
  const removeEntry = useStore((s) => s.removeEntry);
  const moveEntry = useStore((s) => s.moveEntry);
  const clearBoard = useStore((s) => s.clearBoard);
  const refresh = useStore((s) => s.refresh);

  const favKey = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;

  return (
    <section className="board" aria-label={t.boardAria}>
      <div className="board-head">
        <h2>
          {entries.length > 1
            ? interpolate(t.boardMany, { n: entries.length })
            : t.boardOne}
        </h2>
        <div className="board-tools">
          <PlaceSearch
            disabled={false}
            compact
            id="board-place"
            label=""
            ariaLabel={t.boardAddAria}
            placeholder={t.boardAddPlaceholder}
            model={modelById(modelId)}
            onPick={(p) =>
              useStore.getState().addPlaceToBoard({
                lat: p.lat,
                lon: p.lon,
                name: `${p.label}, ${p.detail}`,
              })
            }
          />
          <FavoritesMenu
            list={favs}
            currentKey={favKey}
            disabledKeys={entries.filter(isPlaceEntry).map(pinKey)}
            onPick={(fav) =>
              useStore.getState().addPlaceToBoard({
                lat: fav.lat,
                lon: fav.lon,
                name: fav.label,
              })
            }
          />
          <HistoryMenu />
          <button type="button" className="btn" disabled={false} onClick={refresh}>
            {t.refresh}
          </button>
          {entries.length > 1 ? (
            <button type="button" className="btn ghost" onClick={clearBoard}>
              {t.boardClear}
            </button>
          ) : null}
        </div>
      </div>
      <div className="board-list">
        {entries.map((entry, i) => {
          const key = entryKey(entry);
          if (!isPlaceEntry(entry)) return null;
          return (
            <PinCard
              key={key}
              pin={entry}
              state={entryStates[key]}
              dayKey={dayKey}
              hourTime={hourTime}
              view={view}
              zMax={zMax}
              compact={compact}
              onRemove={() => removeEntry(key)}
              onMove={(delta) => moveEntry(key, delta)}
              showUp={i > 0}
              showDown={i < entries.length - 1}
            />
          );
        })}
      </div>
    </section>
  );
}
