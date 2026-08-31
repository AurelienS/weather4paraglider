import { useI18n } from "../i18nContext";
import { interpolate } from "../lib/i18n";
import { pinKey } from "../lib/pins";
import { modelById } from "../api/models";
import { useStore } from "../stores";
import { FavoritesMenu } from "./FavoritesMenu";
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

/** The compare board: the only component that subscribes to pinStates, so a
 * pin resolution does not re-render the rest of the app. */
export function CompareBoard({ dayKey, hourTime, view, zMax, compact }: Props) {
  const { t } = useI18n();
  const modelId = useStore((s) => s.modelId);
  const point = useStore((s) => s.point);
  const pins = useStore((s) => s.pins);
  const pinStates = useStore((s) => s.pinStates);
  const favs = useStore((s) => s.favs);
  const addPinToBoard = useStore((s) => s.addPinToBoard);
  const removePin = useStore((s) => s.removePin);
  const clearBoard = useStore((s) => s.clearBoard);

  const favKey = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;

  return (
    <section className="board" aria-label={t.boardAria}>
      <div className="board-head">
        <h2>
          {pins.length > 1
            ? interpolate(t.boardMany, { n: pins.length })
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
              addPinToBoard({
                lat: p.lat,
                lon: p.lon,
                name: `${p.label}, ${p.detail}`,
              })
            }
          />
          <FavoritesMenu
            list={favs}
            currentKey={favKey}
            disabledKeys={pins.map(pinKey)}
            onPick={(fav) =>
              addPinToBoard({ lat: fav.lat, lon: fav.lon, name: fav.label })
            }
          />
          <button type="button" className="btn ghost" onClick={clearBoard}>
            {t.boardClear}
          </button>
        </div>
      </div>
      <div className="board-list">
        {pins.map((pin) => {
          const key = pinKey(pin);
          return (
            <PinCard
              key={key}
              pin={pin}
              state={pinStates[key]}
              dayKey={dayKey}
              hourTime={hourTime}
              view={view}
              zMax={zMax}
              compact={compact}
              onRemove={() => removePin(key)}
            />
          );
        })}
      </div>
    </section>
  );
}
