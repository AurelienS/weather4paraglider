import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { searchPlaces, type Place } from "../lib/geocode";
import { interpolate } from "../lib/i18n";
import type { ModelDef } from "../api/models";
import { useI18n } from "../i18nContext";

type Props = {
  disabled: boolean;
  model: ModelDef;
  onPick: (place: Place) => void;
  /** Optional second action per result: add the place to the compare board
   * instead of loading it. The menu stays open so several can be added. */
  onCompare?: (pin: { lat: number; lon: number; name: string }) => void;
  /** DOM id for the input (must be unique per page). */
  id?: string;
  /** Visible uppercase label; omit to render only the input. */
  label?: string;
  /** Accessible name when the visible label is omitted. */
  ariaLabel?: string;
  placeholder?: string;
  compact?: boolean;
};

export function PlaceSearch({
  disabled,
  model,
  onPick,
  onCompare,
  id = "place",
  label,
  ariaLabel,
  placeholder,
  compact = false,
}: Props) {
  const { t } = useI18n();
  const shownLabel = label === undefined ? t.placeLabel : label;
  const shownPlaceholder = placeholder ?? t.placePlaceholder;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const showMenu = open && trimmed.length >= 2 && !disabled;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setFailed(false);
      searchPlaces(q, ac.signal, model.domain)
        .then((places) => {
          if (ac.signal.aborted) return;
          setResults(places);
          setActive(0);
          setOpen(true);
          setSearching(false);
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResults([]);
          setSearching(false);
          setFailed(true);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [query, model.domain]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function pick(place: Place) {
    setOpen(false);
    setQuery("");
    setResults([]);
    onPick(place);
  }

  function compare(place: Place) {
    onCompare?.({
      lat: place.lat,
      lon: place.lon,
      name: place.detail ? `${place.label}, ${place.detail}` : place.label,
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const place = results[active];
      if (place) pick(place);
    }
  }

  return (
    <div className={compact ? "place-search is-compact" : "place-search"} ref={boxRef}>
      {shownLabel ? (
        <label className="place-search-field">
          {shownLabel}
          <input
            id={id}
            type="search"
            placeholder={shownPlaceholder}
            autoComplete="off"
            spellCheck={false}
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showMenu}
            aria-controls={`${id}-results`}
            aria-autocomplete="list"
          />
        </label>
      ) : (
        <input
          id={id}
          type="search"
          aria-label={ariaLabel ?? shownPlaceholder}
          placeholder={shownPlaceholder}
          autoComplete="off"
          spellCheck={false}
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showMenu}
          aria-controls={`${id}-results`}
          aria-autocomplete="list"
        />
      )}
      {showMenu ? (
        <ul className="place-menu" id={`${id}-results`} role="listbox">
          {searching && results.length === 0 ? (
            <li className="place-empty">{t.searching}</li>
          ) : null}
          {!searching && failed ? (
            <li className="place-empty">{t.searchUnavailable}</li>
          ) : null}
          {!searching && !failed && results.length === 0 ? (
            <li className="place-empty">{t.noResults}</li>
          ) : null}
          {results.map((place, i) => (
            <li key={`${place.lat},${place.lon},${i}`} role="none">
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={i === active ? "is-active" : undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(place)}
              >
                <span className="pl-label">{place.label}</span>
                {place.detail ? (
                  <span className="pl-detail">{place.detail}</span>
                ) : null}
              </button>
              {onCompare ? (
                <button
                  type="button"
                  className="place-compare"
                  aria-label={interpolate(t.addCompareAria, { label: place.label })}
                  title={t.addCompare}
                  onClick={() => compare(place)}
                >
                  +
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
