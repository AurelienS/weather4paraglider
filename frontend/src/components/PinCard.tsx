import { useMemo, useState } from "react";
import type { AromeResponse } from "../api/types";
import { groupByDay } from "../lib/format";
import { interpolate } from "../lib/i18n";
import { useI18n } from "../i18nContext";
import { pinKey, type Pin } from "../lib/pins";
import { Sounding } from "./Sounding";
import { SurfaceStats } from "./SurfaceStats";
import { Windgram } from "./Windgram";

export type PinState =
  | { status: "loading" }
  | { status: "ready"; data: AromeResponse }
  | { status: "error"; message: string };

type Props = {
  pin: Pin;
  state: PinState | undefined;
  /** Global day key selected in the main toolbar. */
  dayKey: string | null;
  /** Time of the hour selected in the main toolbar (sounding sync). */
  hourTime: string | null;
  view: "windgram" | "sounding";
  zMax: number;
  compact: boolean;
  onRemove: () => void;
};

export function PinCard({ pin, state, dayKey, hourTime, view, zMax, compact, onRemove }: Props) {
  const { t, lang } = useI18n();
  const [activeZ, setActiveZ] = useState<number | null>(null);
  const label = pin.name ?? `${pin.lat.toFixed(4)}, ${pin.lon.toFixed(4)}`;
  const days = useMemo(
    () => (state?.status === "ready" ? groupByDay(state.data.hours, lang) : []),
    [state, lang],
  );
  const effDay = dayKey != null && days.some((d) => d.key === dayKey) ? dayKey : days[0]?.key;
  const hours = days.find((d) => d.key === effDay)?.hours ?? [];
  const hour = (hourTime && hours.find((h) => h.time === hourTime)) || hours[0];
  const data = state?.status === "ready" ? state.data : null;

  return (
    <section className="board-card" aria-label={interpolate(t.pinAria, { label })}>
      <div className="board-card-head">
        <span className="board-card-name">{label}</span>
        <button
          type="button"
          className="board-card-remove"
          aria-label={interpolate(t.pinRemoveAria, { label })}
          onClick={onRemove}
        >
          ✕
        </button>
      </div>
      {state == null || state.status === "loading" ? (
        <p className="board-card-note">{t.loading}</p>
      ) : state.status === "error" ? (
        <p className="board-card-note error" role="alert">
          {state.message}
        </p>
      ) : view === "windgram" ? (
        hours.length > 0 ? (
          <Windgram hours={hours} elevationM={data!.modelElevationM} zMax={zMax} compact={compact} />
        ) : (
          <p className="board-card-note">{t.noDataDay}</p>
        )
      ) : hour ? (
        <>
          <SurfaceStats hour={hour} elevationM={data!.modelElevationM} />
          <Sounding
            hour={hour}
            elevationM={data!.modelElevationM}
            activeZ={activeZ}
            onActiveZ={setActiveZ}
          />
        </>
      ) : (
        <p className="board-card-note">{t.noDataDay}</p>
      )}
      {data ? (
        <p className="board-card-foot">
          {pinKey(pin)} · {data.model} {data.grid} ·{" "}
          {interpolate(t.pinAlt, { m: data.modelElevationM })}
        </p>
      ) : null}
    </section>
  );
}
