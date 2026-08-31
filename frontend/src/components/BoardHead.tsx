import { useI18n } from "../i18nContext";
import { interpolate } from "../lib/i18n";
import { isPlaceEntry } from "../lib/compare";
import { placeText } from "../lib/geocode";
import { pinKey } from "../lib/pins";
import { modelById } from "../api/models";
import { useStore } from "../stores";
import { FavoritesMenu } from "./FavoritesMenu";
import { HistoryMenu } from "./HistoryMenu";
import { ModelMenu } from "./ModelMenu";
import { PageHeader } from "./PageHeader";
import { PlaceSearch } from "./PlaceSearch";

/** Title and tools of the compare board, in the shared PageHeader
 * skeleton (same component as the place page, different options). */
export function BoardHead() {
  const { t } = useI18n();
  const modelId = useStore((s) => s.modelId);
  const point = useStore((s) => s.point);
  const place = useStore((s) => s.place);
  const compareMode = useStore((s) => s.compareMode);
  const entries = useStore((s) => s.entries);
  const favs = useStore((s) => s.favs);
  const clearBoard = useStore((s) => s.clearBoard);
  const refresh = useStore((s) => s.refresh);
  const showAverage = useStore((s) => s.showAverage);
  const toggleAverage = useStore((s) => s.toggleAverage);

  const favKey = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
  const modelBoard = compareMode === "model";
  const empty = entries.length === 0;
  // model cards are labelled after the place they forecast
  const at = place ?? `${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}`;
  const count = entries.length > 1
    ? interpolate(t.boardModels, { n: entries.length })
    : t.boardOneModel;

  return (
    <PageHeader
      className="board-head"
      title={
        <h2 className="board-title">
          {empty ? (
            modelBoard ? t.boardEmptyModels : t.boardEmptyPlaces
          ) : modelBoard ? (
            <>
              {/* the place name reads white, the count stays muted */}
              {at}
              <span className="board-count"> · {count}</span>
            </>
          ) : entries.length > 1 ? (
            interpolate(t.boardMany, { n: entries.length })
          ) : (
            t.boardOne
          )}
        </h2>
      }
      select={
        modelBoard ? (
          <>
            <ModelMenu />
            {/* switching place re-forecasts the same models elsewhere;
                there is nothing to re-forecast while no model is picked */}
            {!empty ? (
              <PlaceSearch
                disabled={false}
                compact
                id="board-switch"
                ariaLabel={t.boardSwitchAria}
                placeholder={t.boardSwitchPlaceholder}
                model={modelById(modelId)}
                center={point}
                onPick={(p) =>
                  useStore.getState().setModelBoardPlace({
                    lat: p.lat,
                    lon: p.lon,
                    name: placeText(p),
                  })
                }
              />
            ) : null}
          </>
        ) : (
          <PlaceSearch
            disabled={false}
            compact
            id="board-place"
            ariaLabel={t.boardAddAria}
            placeholder={t.boardAddPlaceholder}
            model={modelById(modelId)}
            center={point}
            onPick={(p) =>
              useStore.getState().addPlaceToBoard({
                lat: p.lat,
                lon: p.lon,
                name: placeText(p),
              })
            }
          />
        )
      }
      menus={
        <>
          {!modelBoard ? (
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
          ) : null}
          {modelBoard ? (
            <button
              type="button"
              className="btn board-avg-toggle"
              aria-pressed={showAverage}
              disabled={entries.length < 2}
              onClick={toggleAverage}
            >
              {t.boardAverage}
            </button>
          ) : null}
          <HistoryMenu />
        </>
      }
      onRefresh={refresh}
      refreshDisabled={empty}
      onClear={entries.length > 1 ? clearBoard : undefined}
    />
  );
}
