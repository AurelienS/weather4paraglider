import { useLayoutEffect, useRef, useState } from "react";
import { PRIMARY_MODELS, inModelDomain, modelById, type ModelId } from "../api/models";
import { trackEvent } from "../lib/analytics";
import { omitFavoritePlaces, type Favorite } from "../lib/favorites";
import { interpolate } from "../lib/i18n";
import { useI18n } from "../i18nContext";
import { useStore } from "../stores";
import { PlaceSearch } from "./PlaceSearch";
import { placeText, type Place } from "../lib/geocode";

function pointKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function Contour() {
  return (
    <svg className="contour" viewBox="0 0 240 32" aria-hidden="true">
      <path d="M0 26 C42 26 54 6 88 6 S138 28 168 20 214 4 240 8" />
      <path d="M0 20 C38 20 58 12 92 12 S146 24 180 16 216 10 240 14" />
      <path d="M16 30 C72 30 96 18 148 18 S204 28 240 24" />
    </svg>
  );
}

/** Side column: search, the two models, favorites and recent places.
 * Every row loads its target in one click. */
export function PlaceRail() {
  const { t } = useI18n();
  const lat = useStore((s) => s.point.lat);
  const lon = useStore((s) => s.point.lon);
  const modelId = useStore((s) => s.modelId);
  const loading = useStore((s) => s.loading);
  const favs = useStore((s) => s.favs);
  const storedRecents = useStore((s) => s.recentPlaces);
  const recentPlaces = omitFavoritePlaces(storedRecents, favs);
  const selectModel = useStore((s) => s.selectModel);
  const submitPlace = useStore((s) => s.submitPlace);
  const removeFavorite = useStore((s) => s.removeFavorite);

  const currentKey = pointKey(lat, lon);
  const shownModel = PRIMARY_MODELS.includes(modelId) ? null : modelById(modelId);
  const modelIndex = PRIMARY_MODELS.findIndex((id) => id === modelId);

  function pickPlace(p: Place) {
    submitPlace(p.lat, p.lon, placeText(p));
  }

  function pickSaved(pin: Favorite) {
    submitPlace(pin.lat, pin.lon, pin.label);
  }

  function chooseModel(id: ModelId) {
    if (id === modelId) return;
    selectModel(id);
    trackEvent("model_selected", { model: id });
  }

  return (
    <aside className="rail">
      <Contour />
      <PlaceSearch
        disabled={loading}
        model={modelById(modelId)}
        onPick={pickPlace}
        center={{ lat, lon }}
        ariaLabel={t.placeLabel}
      />

      <section className="rail-block">
        <h2 className="rail-label">{t.modelLabel}</h2>
        <div
          className="model-pair"
          role="radiogroup"
          aria-label={t.modelLabel}
          data-on={modelIndex >= 0 ? modelIndex : undefined}
        >
          {modelIndex >= 0 ? <span className="model-ink" aria-hidden="true" /> : null}
          {PRIMARY_MODELS.map((id) => {
            const model = modelById(id);
            const on = id === modelId;
            const outside = !inModelDomain(lat, lon, model.domain);
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                className={
                  on ? "model-plate is-on" : outside ? "model-plate is-outside" : "model-plate"
                }
                title={outside ? interpolate(t.outOfDomain, { model: model.short }) : model.label}
                onClick={() => chooseModel(id)}
              >
                <span className="model-plate-name">{model.short}</span>
                <span className="model-plate-spec">
                  {model.grid}
                  <span aria-hidden="true"> · </span>
                  {interpolate(t.daysSuffix, { n: model.days })}
                </span>
              </button>
            );
          })}
        </div>
        {shownModel ? <p className="rail-note">{shownModel.short}</p> : null}
      </section>

      <section className="rail-block rail-fav">
        <h2 className="rail-label">{t.railFavorites}</h2>
        {favs.length === 0 ? (
          <p className="fav-empty">
            {t.favoritesEmpty}
            <span className="fav-empty-hint">{t.favoritesEmptyHint}</span>
          </p>
        ) : (
          <PlaceList pins={favs} currentKey={currentKey} onPick={pickSaved} onRemove={removeFavorite} />
        )}
      </section>

      <section className="rail-block rail-recent">
        <h2 className="rail-label">{t.recentPlaces}</h2>
        {recentPlaces.length === 0 ? (
          <p className="rail-empty">{t.recentEmpty}</p>
        ) : (
          <PlaceList pins={recentPlaces} currentKey={currentKey} onPick={pickSaved} />
        )}
      </section>
    </aside>
  );
}

function PlaceList({
  pins,
  currentKey,
  onPick,
  onRemove,
}: {
  pins: Favorite[];
  currentKey: string;
  onPick: (pin: Favorite) => void;
  onRemove?: (pin: Favorite) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLUListElement>(null);
  const [markY, setMarkY] = useState<number | null>(null);
  const token = `${currentKey}|${pins.map((p) => pointKey(p.lat, p.lon)).join(";")}`;

  useLayoutEffect(() => {
    const root = ref.current;
    const row = root?.querySelector<HTMLElement>(".rail-row.is-current");
    if (!root || !row) {
      setMarkY(null);
      return;
    }
    setMarkY(row.offsetTop + (row.offsetHeight - 6) / 2);
  }, [token]);

  return (
    <ul className="rail-list" ref={ref}>
      {markY != null ? (
        <span className="rail-mark" style={{ transform: `translateY(${markY}px)` }} aria-hidden="true" />
      ) : null}
      {pins.map((pin) => (
        <PlaceRow
          key={pointKey(pin.lat, pin.lon)}
          pin={pin}
          current={pointKey(pin.lat, pin.lon) === currentKey}
          onPick={onPick}
          onRemove={onRemove}
          removeLabel={
            onRemove ? interpolate(t.removeFavoriteAria, { label: pin.label }) : undefined
          }
        />
      ))}
    </ul>
  );
}

function PlaceRow({
  pin,
  current,
  onPick,
  onRemove,
  removeLabel,
}: {
  pin: Favorite;
  current: boolean;
  onPick: (pin: Favorite) => void;
  onRemove?: (pin: Favorite) => void;
  removeLabel?: string;
}) {
  return (
    <li className={current ? "rail-row is-current" : "rail-row"}>
      <button type="button" className="rail-place" onClick={() => onPick(pin)}>
        <span className="rail-place-name">{pin.label}</span>
      </button>
      {onRemove && removeLabel ? (
        <button
          type="button"
          className="fav-remove"
          aria-label={removeLabel}
          onClick={() => onRemove(pin)}
        >
          ×
        </button>
      ) : null}
    </li>
  );
}
