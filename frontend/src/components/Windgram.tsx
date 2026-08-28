import { useMemo, useRef, useState, type MouseEvent } from "react";
import type { Hour } from "../api/types";
import { slotsForDay, type HourSlot } from "../lib/format";
import {
  altitudeLevels,
  convectiveTop,
  cssRgb,
  iso0CellZ,
  sampleCell,
  windRgb,
  cellBackground,
  type GramCell,
} from "../lib/windgram";
import { WindArrow } from "./WindArrow";
import { useI18n } from "../i18nContext";
import { interpolate, type Dict } from "../lib/i18n";

type Props = {
  hours: Hour[];
  elevationM: number;
  zMax: number;
  /** Phone layout: every other hour, tighter cells so the grid fits. */
  compact?: boolean;
};

export function Windgram({ hours, elevationM, zMax, compact = false }: Props) {
  const { t } = useI18n();
  const slots = useMemo(
    () => slotsForDay(hours).filter((_, i) => (compact ? i % 2 === 0 : true)),
    [hours, compact],
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
      slots.map((slot) => {
        const hour = slot.data;
        if (!hour) return null;
        const cbl = cblByTime.get(hour.time) ?? null;
        return levels.map((z) => sampleCell(hour, z, elevationM, cbl));
      }),
    [slots, levels, elevationM, cblByTime],
  );
  const iso0Z = useMemo(
    () =>
      slots.map((slot, col) => {
        const hour = slot.data;
        if (!hour) return null;
        const rows = grid[col];
        if (!rows) return null;
        const temps = rows.map((c) => c?.t ?? null);
        return iso0CellZ(levels, temps, hour.surface.t2m, elevationM);
      }),
    [slots, grid, levels, elevationM],
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
        <table className="wg">
          <thead>
            <tr>
              <th className="z">m</th>
              {slots.map((slot) => (
                <th key={slot.hour} className={slot.data ? undefined : "empty"}>
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((z, row) => (
              <tr key={z}>
                <th className="z">{z}</th>
                {slots.map((slot, col) => (
                  <WindCell
                    key={slot.hour}
                    slot={slot}
                    cell={grid[col]?.[row]}
                    iso0={iso0Z[col] === z}
                    onTip={showTip}
                    t={t}
                  />
                ))}
              </tr>
            ))}
            <tr className="sol">
              <th className="z">{interpolate(t.sol, { m: elevationM })}</th>
              {slots.map((slot, col) => (
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
              ))}
            </tr>
            <tr className="band precip">
              <th className="z">{t.rain}</th>
              {slots.map((slot) => {
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
              {slots.map((slot) => {
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
              {slots.map((slot) => (
                <th key={slot.hour} className={slot.data ? undefined : "empty"}>
                  {slot.label}
                </th>
              ))}
            </tr>
          </tfoot>
        </table>
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
    wind: hour.surface.wind10,
    gust: hour.surface.gust10,
    dir: hour.surface.dir10,
    t: hour.surface.t2m,
    td: hour.profile[0]?.td ?? cell.td,
    rh: hour.surface.rh2m,
  };
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
  const color = cell.wind == null ? "#8a8a8a" : cssRgb(windRgb(cell.wind));
  const gust =
    cell.wind != null && cell.gust != null && cell.gust >= cell.wind + 5
      ? cell.gust
      : null;
  const text = cellTip(cell, t);
  return (
    <td
      className={`cell${iso0 ? " iso0" : ""}${gust != null ? " has-gust" : ""}`}
      style={{
        background: cssRgb(cellBackground(cell.wMs, cell.cloud)),
      }}
      onMouseEnter={(e) => onTip(text, e)}
      onMouseMove={(e) => onTip(text, e)}
      onMouseLeave={() => onTip(null)}
    >
      <span className="in">
        {cell.dir != null && cell.wind != null ? (
          <WindArrow dir={cell.dir} speed={cell.wind} color={color} />
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
  return `${tTxt} · ${neb}`;
}
