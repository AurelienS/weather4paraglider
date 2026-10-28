import { Fragment, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { Hour } from "../api/types";
import { FLYING_Z_MAX_M } from "../lib/ceiling";
import {
  CORE_HOUR_MAX,
  CORE_HOUR_MIN,
  CORE_HOUR_WINDOW,
  slotsForDay,
  type HourSlot,
  type HourWindow,
} from "../lib/format";
import {
  altitudeLevels,
  convectiveTop,
  cssRgb,
  groundTintZ,
  iso0CellZ,
  sampleCell,
  windRgb,
  cellBackground,
  arrowInk,
  arrowEdge,
  type GramCell,
} from "../lib/windgram";
import { thermalSpeed } from "../lib/convection";
import { WindArrow } from "./WindArrow";
import { useI18n } from "../i18nContext";
import { interpolate, type Dict } from "../lib/i18n";

/** A row or column in the chart that opens or closes a shoulder. */
export type ChartHinge = {
  open: boolean;
  /** Accessible name. Also the words drawn when `text` is absent. */
  label: string;
  /** Short word drawn in a narrow column. */
  text?: string;
  onToggle: () => void;
};

type Props = {
  hours: Hour[];
  elevationM: number;
  zMax: number;
  /** Phone layout: every other hour, tighter cells so the grid fits. */
  compact?: boolean;
  /** Columns to draw. Defaults to 08:00–20:00. */
  span?: HourWindow;
  /** Row sitting just above 5 km. Null hides it. */
  lift?: ChartHinge | null;
  /** Column sitting just before 08:00. */
  early?: ChartHinge | null;
  /** Column sitting just after 20:00. */
  late?: ChartHinge | null;
};

export function Windgram({
  hours,
  elevationM,
  zMax,
  compact = false,
  span = CORE_HOUR_WINDOW,
  lift = null,
  early = null,
  late = null,
}: Props) {
  const { t } = useI18n();
  const slots = useMemo(() => {
    const thin = (list: HourSlot[]) => (compact ? list.filter((_, i) => i % 2 === 0) : list);
    const all = slotsForDay(hours, span);
    return {
      earlySlots: thin(all.filter((s) => s.hour < CORE_HOUR_MIN)),
      coreSlots: thin(all.filter((s) => s.hour >= CORE_HOUR_MIN && s.hour <= CORE_HOUR_MAX)),
      lateSlots: thin(all.filter((s) => s.hour > CORE_HOUR_MAX)),
    };
  }, [hours, compact, span]);
  const { earlySlots, coreSlots, lateSlots } = slots;
  const hourSlots = useMemo(
    () => [...earlySlots, ...coreSlots, ...lateSlots],
    [earlySlots, coreSlots, lateSlots],
  );
  const levels = useMemo(() => {
    const dataMax = Math.max(0, ...hours.flatMap((h) => h.profile.map((p) => p.z)));
    return altitudeLevels(elevationM, Math.min(zMax, dataMax)).slice().reverse();
  }, [hours, elevationM, zMax]);
  const cblByTime = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const hour of hours) {
      map.set(hour.time, convectiveTop(hour, elevationM));
    }
    return map;
  }, [hours, elevationM]);
  const grid = useMemo(
    () =>
      hourSlots.map((slot) => {
        const hour = slot.data;
        if (!hour) return null;
        const cbl = cblByTime.get(hour.time) ?? null;
        return levels.map((z) => sampleCell(hour, z, elevationM, cbl));
      }),
    [hourSlots, levels, elevationM, cblByTime],
  );
  const iso0Z = useMemo(
    () =>
      hourSlots.map((slot, col) => {
        const hour = slot.data;
        if (!hour) return null;
        const rows = grid[col];
        if (!rows) return null;
        const temps = rows.map((c) => c?.t ?? null);
        return iso0CellZ(levels, temps, hour.surface.t2m, elevationM);
      }),
    [hourSlots, grid, levels, elevationM],
  );
  const colCount = hourSlots.length + (early ? 1 : 0) + (late ? 1 : 0);
  const liftBefore =
    lift == null ? -1 : Math.max(0, levels.findIndex((z) => z <= FLYING_Z_MAX_M));
  const axis = (
    place: "head" | "foot" | "body",
    renderHour: (slot: HourSlot) => ReactNode,
    mark = false,
  ) => (
    <HourAxis
      earlySlots={earlySlots}
      coreSlots={coreSlots}
      lateSlots={lateSlots}
      early={early}
      late={late}
      place={place}
      mark={mark}
      renderHour={renderHour}
    />
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  function showTip(text: string | null, ev?: MouseEvent) {
    if (!text || !ev) {
      setTip(null);
      return;
    }
    const root = panelRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    setTip({
      text,
      x: x + 14 > rect.width - 8 ? x - 130 : x + 14,
      y: y + 36 > rect.height - 8 ? y - 40 : y + 16,
    });
  }

  return (
    <div className={compact ? "wg-panel is-compact" : "wg-panel"} ref={panelRef}>
      <div className="wg-scroll">
        <div className="wg-frame">
        <table className="wg">
          <thead>
            <tr>
              <th className="z">m</th>
              {axis("head", (slot) => (
                <th key={slot.hour} className={slot.data ? undefined : "empty"}>
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((z, row) => (
              <Fragment key={z}>
                {row === liftBefore && lift ? (
                  <tr className={lift.open ? "z-hinge is-on" : "z-hinge"}>
                    <th colSpan={1 + colCount}>
                      <button
                        type="button"
                        aria-pressed={lift.open}
                        aria-label={lift.label}
                        title={lift.label}
                        onClick={lift.onToggle}
                      >
                        <span>{lift.label}</span>
                      </button>
                    </th>
                  </tr>
                ) : null}
                <tr>
                  <th className="z">{z}</th>
                  {axis(
                    "body",
                    (slot) => (
                      <WindCell
                        key={slot.hour}
                        slot={slot}
                        cell={grid[hourSlots.indexOf(slot)]?.[row]}
                        iso0={iso0Z[hourSlots.indexOf(slot)] === z}
                        onTip={showTip}
                        t={t}
                      />
                    ),
                    row === 0,
                  )}
                </tr>
              </Fragment>
            ))}
            <tr className="sol">
              <th className="z">{interpolate(t.sol, { m: elevationM })}</th>
              {axis("body", (slot) => {
                const col = hourSlots.indexOf(slot);
                return (
                  <WindCell
                    key={slot.hour}
                    slot={slot}
                    cell={
                      slot.data
                        ? solCell(
                            slot.data,
                            elevationM,
                            cblByTime.get(slot.data.time) ?? null,
                          )
                        : undefined
                    }
                    iso0={iso0Z[col] === elevationM}
                    onTip={showTip}
                    t={t}
                  />
                );
              })}
            </tr>
            <tr className="band precip">
              <th className="z">{t.rain}</th>
              {axis("body", (slot) => {
                if (!slot.data)
                  return <EmptyBand key={slot.hour} onTip={showTip} label={t.outOfForecast} />;
                const p = slot.data.surface.precip ?? 0;
                return (
                  <td
                    key={slot.hour}
                    style={{
                      background:
                        p > 0 ? `rgba(120, 170, 220, ${Math.min(0.2 + p / 10, 0.7)})` : undefined,
                    }}
                    onMouseEnter={(e) => showTip(`${p.toFixed(1)} mm`, e)}
                    onMouseMove={(e) => showTip(`${p.toFixed(1)} mm`, e)}
                    onMouseLeave={() => showTip(null)}
                  >
                    {p > 0 ? p.toFixed(1) : ""}
                  </td>
                );
              })}
            </tr>
            <tr className="band">
              <th className="z">{t.tSoil}</th>
              {axis("body", (slot) => {
                const hour = slot.data;
                if (!hour) return <EmptyBand key={slot.hour} onTip={showTip} label={t.outOfForecast} />;
                const tTxt =
                  hour.surface.t2m == null ? t.tMissing : `T ${hour.surface.t2m.toFixed(1)}°`;
                return (
                  <td
                    key={slot.hour}
                    onMouseEnter={(e) => showTip(tTxt, e)}
                    onMouseMove={(e) => showTip(tTxt, e)}
                    onMouseLeave={() => showTip(null)}
                  >
                    {hour.surface.t2m == null ? "" : hour.surface.t2m.toFixed(0)}
                  </td>
                );
              })}
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th className="z" />
              {axis("foot", (slot) => (
                <th key={slot.hour} className={slot.data ? undefined : "empty"}>
                  {slot.label}
                </th>
              ))}
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
      {tip ? (
        <div className="wg-cursor-tip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      ) : null}
    </div>
  );
}

function solCell(hour: Hour, elevationM: number, cblTop: number | null): GramCell {
  const cell = sampleCell(hour, elevationM, elevationM, cblTop);
  return {
    ...cell,
    // Zero exactly at the surface. Tint the band up to the next altitude line.
    wMs: thermalSpeed(hour, groundTintZ(elevationM), elevationM, cblTop),
    wind: hour.surface.wind10,
    gust: hour.surface.gust10,
    dir: hour.surface.dir10,
    t: hour.surface.t2m,
    td: hour.profile[0]?.td ?? cell.td,
    rh: hour.surface.rh2m,
  };
}

function HourAxis({
  earlySlots,
  coreSlots,
  lateSlots,
  early,
  late,
  place,
  mark = false,
  renderHour,
}: {
  earlySlots: HourSlot[];
  coreSlots: HourSlot[];
  lateSlots: HourSlot[];
  early: ChartHinge | null;
  late: ChartHinge | null;
  place: "head" | "foot" | "body";
  /** Draw the word once, centered on the column. */
  mark?: boolean;
  renderHour: (slot: HourSlot) => ReactNode;
}) {
  return (
    <>
      {earlySlots.map((slot) => renderHour(slot))}
      {early ? <HourSeam key="early" hinge={early} place={place} mark={mark} /> : null}
      {coreSlots.map((slot) => renderHour(slot))}
      {late ? <HourSeam key="late" hinge={late} place={place} mark={mark} /> : null}
      {lateSlots.map((slot) => renderHour(slot))}
    </>
  );
}

function HourSeam({
  hinge,
  place,
  mark = false,
}: {
  hinge: ChartHinge;
  place: "head" | "foot" | "body";
  mark?: boolean;
}) {
  const className = hinge.open ? "hinge is-on" : "hinge";
  const word = hinge.text ?? hinge.label;
  if (place === "head") {
    return (
      <th className={className}>
        <button
          type="button"
          aria-pressed={hinge.open}
          aria-label={hinge.label}
          title={hinge.label}
          onClick={hinge.onToggle}
        >
          <span className="hinge-name">{word}</span>
        </button>
      </th>
    );
  }
  if (place === "foot") {
    return <th className={className} title={hinge.label} onClick={hinge.onToggle} />;
  }
  return (
    <td className={className} onClick={hinge.onToggle}>
      {mark && !hinge.open ? (
        <span className="hinge-mark" aria-hidden="true">
          <span>{word}</span>
        </span>
      ) : null}
    </td>
  );
}

function EmptyBand({
  onTip,
  label,
}: {
  onTip: (text: string | null, ev?: MouseEvent) => void;
  label: string;
}) {
  return (
    <td
      className="empty"
      onMouseEnter={(e) => onTip(label, e)}
      onMouseMove={(e) => onTip(label, e)}
      onMouseLeave={() => onTip(null)}
    />
  );
}

function WindCell({
  slot,
  cell,
  iso0,
  onTip,
  t,
}: {
  slot: HourSlot;
  cell: GramCell | undefined;
  iso0?: boolean;
  onTip: (text: string | null, ev?: MouseEvent) => void;
  t: Dict;
}) {
  if (!slot.data) {
    return (
      <td
        className="cell empty"
        onMouseEnter={(e) => onTip(t.outOfForecast, e)}
        onMouseMove={(e) => onTip(t.outOfForecast, e)}
        onMouseLeave={() => onTip(null)}
      />
    );
  }
  if (!cell || cell.belowTerrain) {
    return <td className="rock" />;
  }
  const bg = cellBackground(cell.wMs, cell.cloud);
  const gust =
    cell.wind != null && cell.gust != null && cell.gust >= cell.wind + 5
      ? cell.gust
      : null;
  const text = cellTip(cell, t);
  return (
    <td
      className={`cell${iso0 ? " iso0" : ""}${gust != null ? " has-gust" : ""}`}
      style={{ background: cssRgb(bg) }}
      onMouseEnter={(e) => onTip(text, e)}
      onMouseMove={(e) => onTip(text, e)}
      onMouseLeave={() => onTip(null)}
    >
      <span className="in">
        {cell.dir != null && cell.wind != null ? (
          <WindArrow
            dir={cell.dir}
            speed={cell.wind}
            color={cssRgb(arrowInk(windRgb(cell.wind), bg))}
            edge={cssRgb(arrowEdge(bg))}
          />
        ) : null}
        <span className="n">
          <b>{cell.wind ?? ""}</b>
          {gust != null ? <i>{gust}</i> : null}
        </span>
      </span>
    </td>
  );
}

function cellTip(cell: GramCell, t: Dict): string {
  const tTxt = cell.t == null ? t.tMissing : `T ${cell.t.toFixed(1)}°`;
  const neb = interpolate(t.tipNeb, { n: cell.cloud ?? 0 });
  if (cell.wMs >= 0.3) {
    const lift = interpolate(t.tipLift, { n: cell.wMs.toFixed(1) });
    return `${tTxt} · ${lift} · ${neb}`;
  }
  return `${tTxt} · ${neb}`;
}
