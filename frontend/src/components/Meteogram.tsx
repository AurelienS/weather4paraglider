import { useId, useMemo } from "react";
import type { Hour } from "../api/types";
import { hourOfDay } from "../lib/format";
import { useI18n } from "../i18nContext";
import {
  cblSeries,
  cloudDecks,
  cloudMaxM,
  meteoHourTicks,
  PRECIP_SCALE_MM,
  smoothClosedPath,
  spreadLabels,
  tempRange,
  windMax,
  type XY,
} from "../lib/meteogram";

type Props = {
  /** The 24 h of the selected day (00:00–23:00 Paris), sorted by time. */
  hours: Hour[];
  elevationM: number;
  compact: boolean;
};

// viewBox geometry: ONE shared plot with a single altitude axis — 0 m sits
// on the chart's bottom line, the same line the wind area and the rain
// bars stand on. Clouds and the convective layer use the real altitude
// scale; temperature and wind are curves with their values riding them.
const VB_W = 768;
const PAD_L = 34;
// wide right margin: the curve names sit outside the plot, level with the
// last point of their curve (the convective layer may end well before)
const PAD_R = 92;
const PLOT_W = VB_W - PAD_L - PAD_R;
const SLOT_W = PLOT_W / 24;

const PLOT_Y = 12;
const PLOT_H = 196;
const PLOT_B = PLOT_Y + PLOT_H; // the 0 line: ground, wind 0, rain 0
const ARROW_Y = PLOT_B + 8;
const ARROW_H = 14;
const TIME_Y = ARROW_Y + ARROW_H + 8;
const VB_H = TIME_Y + 14;

// wind fills the bottom 45% of the plot, temperature lives at 30–62% height
const WIND_SPAN = PLOT_H * 0.45;
const TEMP_TOP = PLOT_Y + PLOT_H * 0.3;
const TEMP_BOT = PLOT_Y + PLOT_H * 0.62;

const xOf = (hour: number) => PAD_L + (hour + 0.5) * SLOT_W;

/**
 * meteoblue-style compact meteogram: one shared plot, one altitude axis.
 * Rain bars stand on the 0 m bottom line, the wind area rises from the
 * same line, gray decks and the yellow convective-top line sit at their
 * real altitude. Every curve carries its name and its values, written in
 * the curve's own color. All panels share the 00:00–24:00 axis of the day.
 */
export function Meteogram({ hours, elevationM, compact }: Props) {
  const { t } = useI18n();
  const uid = useId().replace(/:/g, "");

  const mMax = useMemo(() => {
    const cbl = Math.max(0, ...cblSeries(hours, elevationM).map((p) => p.zM));
    return Math.max(cloudMaxM(hours), Math.ceil(cbl / 500) * 500);
  }, [hours, elevationM]);

  const tR = useMemo(() => tempRange(hours), [hours]);
  const wMax = useMemo(() => windMax(hours), [hours]);
  const cbl = useMemo(() => cblSeries(hours, elevationM), [hours, elevationM]);
  const ticks = useMemo(() => meteoHourTicks(compact ? 3 : 2), [compact]);
  const labelEvery = compact ? 3 : 2;

  const mToY = (m: number) => PLOT_B - (m / mMax) * PLOT_H;
  const tToY = (v: number) =>
    TEMP_BOT - ((v - tR.min) / (tR.max - tR.min)) * (TEMP_BOT - TEMP_TOP);
  const wToY = (v: number) => PLOT_B - (v / wMax) * WIND_SPAN;
  // rain bars share one fixed scale across every meteogram: 10 mm reaches
  // half the plot height, heavier hours saturate (the label keeps the value)
  const pToH = (mm: number) => Math.min(1, mm / PRECIP_SCALE_MM) * (PLOT_H * 0.5);

  // series as points (hours with data only), for polylines and label anchors
  const tempPts = hours
    .filter((h) => h.surface.t2m != null)
    .map((h) => ({ x: xOf(hourOfDay(h.time)), y: tToY(h.surface.t2m!) }));
  const tdPts = hours
    .map((h) => ({ h, td: [...h.profile].sort((a, b) => a.z - b.z)[0]?.td ?? null }))
    .filter((p): p is { h: Hour; td: number } => p.td != null)
    .map((p) => ({ x: xOf(hourOfDay(p.h.time)), y: tToY(p.td) }));
  const windPts = hours
    .filter((h) => h.surface.wind10 != null)
    .map((h) => ({ x: xOf(hourOfDay(h.time)), y: wToY(h.surface.wind10!) }));
  const gustPts = hours
    .filter((h) => h.surface.gust10 != null)
    .map((h) => ({ x: xOf(hourOfDay(h.time)), y: wToY(h.surface.gust10!) }));
  const cblPts = cbl.map((p) => ({ x: xOf(p.hour), y: mToY(p.zM) }));

  const join = (pts: XY[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");
  const windArea =
    windPts.length > 0
      ? `${PAD_L},${PLOT_B} ${join(windPts)} ${PAD_L + PLOT_W},${PLOT_B}`
      : null;

  const rainBars = hours
    .filter((h) => (h.surface.precip ?? 0) > 0)
    .map((h) => ({
      hour: hourOfDay(h.time),
      mm: h.surface.precip!,
      top: PLOT_B - pToH(h.surface.precip!),
    }));

  return (
    <figure className="meteo">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={t.viewMeteogram}
        className="meteo-svg"
      >
        <defs>
          <clipPath id={`meteo-plot-${uid}`}>
            <rect x={PAD_L} y={PLOT_Y} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>
        <rect x="0" y="0" width={VB_W} height={VB_H} className="meteo-bg" />

        {/* hour grid + time labels */}
        {ticks.map((h) => (
          <g key={h}>
            <line
              x1={xOf(h)}
              x2={xOf(h)}
              y1={PLOT_Y}
              y2={TIME_Y - 4}
              className="meteo-grid"
            />
            <text x={xOf(h)} y={TIME_Y + 9} className="meteo-t">
              {String(h).padStart(2, "0")}
            </text>
          </g>
        ))}

        <g clipPath={`url(#meteo-plot-${uid})`}>
          {/* continuous cloud decks stacked above the model's cloud base:
              smooth soft bands (Catmull-Rom), thickness follows the cover */}
          {[0, 1, 2].map((layer) => {
            type Edge = { x: number; bY: number; tY: number };
            const pts: (Edge | null)[] = hours.map((h) => {
              const d = cloudDecks(h)[layer];
              return d
                ? { x: xOf(hourOfDay(h.time)), bY: mToY(d.baseM), tY: mToY(d.topM) }
                : null;
            });
            const runs: Edge[][] = [];
            let cur: Edge[] = [];
            for (const p of pts) {
              if (p) cur.push(p);
              else if (cur.length > 0) {
                runs.push(cur);
                cur = [];
              }
            }
            if (cur.length > 0) runs.push(cur);
            return runs.map((run, r) => {
              // one closed soft outline: bottom edge left→right, top edge
              // right→left, every corner rounded (ends included)
              const outline: XY[] = [
                ...run.map((p): XY => ({ x: p.x, y: p.bY })),
                ...run
                  .slice()
                  .reverse()
                  .map((p): XY => ({ x: p.x, y: p.tY })),
              ];
              return (
                <path
                  key={`${layer}-${r}`}
                  d={smoothClosedPath(outline)}
                  className="meteo-cloud"
                  opacity={0.5}
                />
              );
            });
          })}

          {/* wind: green area rising from the 0 line + gust line above */}
          {windArea ? <polygon points={windArea} className="meteo-wind" /> : null}
          <polyline points={join(gustPts)} className="meteo-gust" />

          {/* rain: slim bars standing on the 0 line */}
          {rainBars.map((b) => (
            <rect
              key={b.hour}
              x={xOf(b.hour) - SLOT_W * 0.25}
              y={PLOT_B - pToH(b.mm)}
              width={SLOT_W * 0.5}
              height={pToH(b.mm)}
              className="meteo-precip"
            />
          ))}

          {/* temperature + dew point curves in their own band */}
          <polyline points={join(tdPts)} className="meteo-td" />
          <polyline points={join(tempPts)} className="meteo-temp" />

          {/* the convective layer top, in yellow, at its real altitude */}
          {cblPts.length > 1 ? (
            <polyline points={join(cblPts)} className="meteo-cbl" />
          ) : null}
        </g>

        {/* the shared 0 line: ground level, wind 0, rain 0 */}
        <line
          x1={PAD_L}
          x2={PAD_L + PLOT_W}
          y1={PLOT_B}
          y2={PLOT_B}
          className="meteo-baseline"
        />

        {/* altitude axis (left, ticks): kept for clouds + convective layer;
            the right margin belongs to the curve names */}
        {[0, mMax / 2, mMax].map((m) => (
          <text key={m} x={PAD_L - 6} y={mToY(m) + 3.5} className="meteo-tx meteo-tx-l">
            {Math.round(m)}
          </text>
        ))}
        <text x={PAD_L - 6} y={PLOT_Y + 2} className="meteo-unit meteo-tx-l">
          m
        </text>

        {/* rain values just above each bar, in the rain color */}
        {rainBars.map((b) =>
          b.mm >= 0.1 ? (
            <text
              key={b.hour}
              x={xOf(b.hour)}
              y={b.top - 3}
              className="meteo-val meteo-val-r"
            >
              {b.mm.toFixed(1)}
            </text>
          ) : null,
        )}

        {/* temperature values riding the curve, with the unit, in the
            temp color */}
        {hours.map((h, i) =>
          h.surface.t2m != null && i % labelEvery === 0 ? (
            <text
              key={h.time}
              x={xOf(hourOfDay(h.time))}
              y={tToY(h.surface.t2m) - 4}
              className="meteo-val meteo-val-t"
            >
              {Math.round(h.surface.t2m)}°
            </text>
          ) : null,
        )}

        {/* gust values above the gust line, in the gust color */}
        {hours.map((h, i) =>
          h.surface.gust10 != null && i % labelEvery === 1 ? (
            <text
              key={h.time}
              x={xOf(hourOfDay(h.time))}
              y={wToY(h.surface.gust10) - 4}
              className="meteo-val meteo-val-g"
            >
              {h.surface.gust10}
            </text>
          ) : null,
        )}

        {/* wind values inside the area, in the wind color */}
        {hours.map((h, i) =>
          h.surface.wind10 != null && i % labelEvery === 0 ? (
            <text
              key={h.time}
              x={xOf(hourOfDay(h.time))}
              y={wToY(h.surface.wind10) + 11}
              className="meteo-val meteo-val-w"
            >
              {h.surface.wind10}
            </text>
          ) : null,
        )}

        {/* direction arrows below the plot, pointing downwind */}
        {hours.map((h) => {
          if (h.surface.dir10 == null || !ticks.includes(hourOfDay(h.time))) {
            return null;
          }
          const cx = xOf(hourOfDay(h.time));
          const cy = ARROW_Y + ARROW_H / 2;
          const speed = h.surface.wind10 ?? 0;
          if (speed < 1.5) {
            return <circle key={h.time} cx={cx} cy={cy} r={2.2} className="meteo-calm" />;
          }
          return (
            <g
              key={h.time}
              transform={`translate(${cx} ${cy}) rotate(${h.surface.dir10 + 180})`}
              className="meteo-arrow"
            >
              <line x1={0} y1={-5.5} x2={0} y2={5.5} />
              <path d="M 0 -6.5 L 2.8 -2.6 L -2.8 -2.6 Z" />
            </g>
          );
        })}

        {/* ── curve names: to the right of the plot, level with the last
              point of their curve (the convective layer may end early);
              a spread pass keeps them readable, never overlapping ── */}
        {(() => {
          const rx = PAD_L + PLOT_W + 6;
          const wants: Array<{ key: string; y: number; text: string; cls: string }> = [];
          if (cblPts.length > 0) {
            wants.push({ key: "cbl", y: cblPts[cblPts.length - 1]!.y + 3, text: t.meteoLblCbl, cls: "meteo-lbl-cbl" });
          }
          if (tdPts.length > 0) {
            wants.push({ key: "td", y: tdPts[tdPts.length - 1]!.y + 3, text: t.meteoLblTd, cls: "meteo-lbl-td" });
          }
          if (windPts.length > 0) {
            wants.push({ key: "wind", y: windPts[windPts.length - 1]!.y + 3, text: t.meteoLblWind, cls: "meteo-lbl-wind" });
          }
          if (gustPts.length > 0) {
            wants.push({ key: "gust", y: gustPts[gustPts.length - 1]!.y + 3, text: t.meteoLblGust, cls: "meteo-lbl-gust" });
          }
          const ys = spreadLabels(
            wants.map(({ key, y }) => ({ key, y })),
            PLOT_Y + 10,
            PLOT_B,
          );
          return wants.map((n) => (
            <text key={n.key} x={rx} y={ys[n.key]} className={`meteo-lbl ${n.cls}`}>
              {n.text}
            </text>
          ));
        })()}
      </svg>
    </figure>
  );
}
