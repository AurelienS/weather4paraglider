import { cssRgb, thermalRgb, windRgb, type RGB } from "../lib/windgram";
import { useI18n } from "../i18nContext";

const REPO = "https://github.com/AurelienS/weather4paraglider";
const ISSUE_BUG = `${REPO}/issues/new?labels=bug`;
const ISSUE_FEATURE = `${REPO}/issues/new?labels=enhancement`;

/** Mirrors the real windgram cell: thermal-tinted background (optionally
 * veiled gray by clouds), wind-colored arrow, ink speed number and a small
 * brick-red gust number below it. */
type DemoCell = { kmh: number; gust: number; dir: number; w: number; cloud?: number };

function demoCellBg(cell: DemoCell): string {
  let rgb: RGB = [255, 255, 255];
  if (cell.w > 0.05) rgb = thermalRgb(cell.w);
  if (cell.cloud != null && cell.cloud >= 10) {
    const fog = 0.14 + 0.36 * ((cell.cloud - 10) / 90);
    rgb = [
      Math.round(rgb[0] + (148 - rgb[0]) * fog),
      Math.round(rgb[1] + (150 - rgb[1]) * fog),
      Math.round(rgb[2] + (154 - rgb[2]) * fog),
    ];
  }
  return cssRgb(rgb);
}

const DEMO_HOURS = ["10h", "11h", "12h", "13h", "14h"];

const DEMO_ROWS: { alt: string; cells: DemoCell[] }[] = [
  {
    // above the convective layer: no thermals, cloud veil at midday
    alt: "2000 m",
    cells: [
      { kmh: 14, gust: 0, dir: 245, w: 0 },
      { kmh: 19, gust: 0, dir: 248, w: 0 },
      { kmh: 26, gust: 31, dir: 250, w: 0, cloud: 45 },
      { kmh: 33, gust: 39, dir: 252, w: 0, cloud: 60 },
      { kmh: 41, gust: 48, dir: 255, w: 0, cloud: 70 },
    ],
  },
  {
    // near the top of the convective layer: weak lift
    alt: "1500 m",
    cells: [
      { kmh: 8, gust: 0, dir: 240, w: 0.6 },
      { kmh: 12, gust: 0, dir: 242, w: 0.6 },
      { kmh: 17, gust: 0, dir: 245, w: 0.7 },
      { kmh: 22, gust: 27, dir: 246, w: 0.7 },
      { kmh: 28, gust: 0, dir: 248, w: 0.5 },
    ],
  },
  {
    // bottom of the convective layer: strong thermals
    alt: "1000 m",
    cells: [
      { kmh: 3, gust: 0, dir: 230, w: 1.6 },
      { kmh: 5, gust: 11, dir: 232, w: 2.2 },
      { kmh: 8, gust: 0, dir: 235, w: 2.6 },
      { kmh: 10, gust: 0, dir: 236, w: 2.8 },
      { kmh: 13, gust: 0, dir: 238, w: 2.4 },
    ],
  },
];

const CELL_W = 88;
const CELL_H = 40;
const LABEL_W = 58;
const HEAD_H = 20;
const FOOT_H = 16;
const DEMO_W = LABEL_W + DEMO_HOURS.length * CELL_W;
const DEMO_H = HEAD_H + DEMO_ROWS.length * CELL_H + FOOT_H;

function GramDemo() {
  return (
    <svg
      className="gram-demo"
      viewBox={`0 0 ${DEMO_W} ${DEMO_H}`}
      aria-hidden="true"
    >
      {DEMO_HOURS.map((h, i) => (
        <text
          key={h}
          x={LABEL_W + i * CELL_W + CELL_W / 2}
          y={14}
          className="gd-hours"
          textAnchor="middle"
        >
          {h}
        </text>
      ))}
      {DEMO_ROWS.map((row, r) => (
        <g key={row.alt}>
          <text
            x={LABEL_W - 10}
            y={HEAD_H + r * CELL_H + CELL_H / 2 + 4}
            className="gd-alt"
            textAnchor="end"
          >
            {row.alt}
          </text>
          {row.cells.map((c, i) => {
            const x = LABEL_W + i * CELL_W;
            const y = HEAD_H + r * CELL_H;
            return (
              <g key={i}>
                <rect
                  x={x + 1.5}
                  y={y + 1.5}
                  width={CELL_W - 3}
                  height={CELL_H - 3}
                  rx={3}
                  fill={demoCellBg(c)}
                />
                <g
                  transform={`translate(${x + 12} ${y + CELL_H / 2 - 12}) rotate(${
                    c.dir + 180
                  } 8 8)`}
                >
                  <line
                    x1="8"
                    y1="14"
                    x2="8"
                    y2="4"
                    stroke={cssRgb(windRgb(c.kmh))}
                    strokeWidth={3.2}
                    strokeLinecap="round"
                  />
                  <polygon
                    points="8,0.5 2.2,9 13.8,9"
                    fill={cssRgb(windRgb(c.kmh))}
                  />
                </g>
                <text
                  x={x + CELL_W / 2 + 14}
                  y={y + CELL_H / 2 + 1}
                  className="gd-speed"
                  textAnchor="middle"
                >
                  {c.kmh}
                </text>
                {c.gust > 0 ? (
                  <text
                    x={x + CELL_W / 2 + 14}
                    y={y + CELL_H / 2 + 13}
                    className="gd-gust"
                    textAnchor="middle"
                  >
                    {c.gust}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      ))}
      {/* 0 °C isotherm: blue line across the top of the 1500 m row */}
      <line
        x1={LABEL_W}
        y1={HEAD_H + CELL_H + 2}
        x2={DEMO_W}
        y2={HEAD_H + CELL_H + 2}
        className="gd-iso"
      />
      <text
        x={DEMO_W}
        y={HEAD_H + CELL_H - 5}
        className="gd-iso-label"
        textAnchor="end"
      >
        0 °C
      </text>
      {DEMO_HOURS.map((h, i) => (
        <text
          key={`f-${h}`}
          x={LABEL_W + i * CELL_W + CELL_W / 2}
          y={HEAD_H + DEMO_ROWS.length * CELL_H + 12}
          className="gd-hours"
          textAnchor="middle"
        >
          {h}
        </text>
      ))}
    </svg>
  );
}

function GramScale() {
  const stops = [0, 8, 12, 22, 32, 42, 55]
    .map((v) => `${cssRgb(windRgb(v))} ${(v / 55) * 100}%`)
    .join(", ");
  return (
    <div className="gram-scale" aria-hidden="true">
      <span className="gs-bar" style={{ background: `linear-gradient(90deg, ${stops})` }} />
      <span className="gs-ticks">
        <span>0</span>
        <span>15</span>
        <span>30</span>
        <span>50+</span>
      </span>
      <span className="gs-unit">km/h</span>
    </div>
  );
}

export function Guide({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <article className="guide" aria-label={t.guideTitle}>
      <div className="guide-head">
        <h2>{t.guideTitle}</h2>
        <button type="button" className="btn" onClick={onBack}>
          {t.guideBack}
        </button>
      </div>
      <p className="guide-intro">{t.guideIntro}</p>
      <section>
        <h3>{t.guideHowTitle}</h3>
        <p>{t.guideHowP1}</p>
        <p>{t.guideHowP2}</p>
      </section>
      <section>
        <h3>{t.guideGramTitle}</h3>
        <p>{t.guideGramP1}</p>
        <GramDemo />
        <p>{t.guideGramP2}</p>
        <ul className="gram-legend">
          <li>
            <span className="lg-speed">24</span> {t.demoSpeed}
          </li>
          <li>
            <span className="lg-gust">38</span> {t.demoGust}
          </li>
          <li>
            <svg viewBox="0 0 32 32" className="lg-arrow" aria-hidden="true">
              <g transform="rotate(0 16 16)">
                <line
                  x1="16"
                  y1="28"
                  x2="16"
                  y2="9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <polygon points="16,3 7.5,15 24.5,15" fill="currentColor" />
              </g>
            </svg>
            {t.demoArrow}
          </li>
          <li>
            <span className="lg-hover">⌖</span> {t.demoHover}
          </li>
        </ul>
        <GramScale />
      </section>
      <section>
        <h3>{t.guideSoundTitle}</h3>
        <p>{t.guideSoundP1}</p>
        <p>{t.guideSoundP2}</p>
        <p>{t.guideSoundP3}</p>
      </section>
      <section>
        <h3>{t.guideModelsTitle}</h3>
        <p>{t.guideModelsP1}</p>
        <p>{t.guideModelsP2}</p>
      </section>
      <section>
        <h3>{t.guideLimitsTitle}</h3>
        <p>{t.guideLimitsP1}</p>
        <p>{t.guideLimitsP2}</p>
      </section>
      <section>
        <h3>{t.guideQuotaTitle}</h3>
        <p>{t.guideQuotaP1}</p>
        <p>{t.guideQuotaP2}</p>
      </section>
      <section>
        <h3>{t.guideDataTitle}</h3>
        <p>{t.guideDataP1}</p>
        <p>{t.guideDataP2}</p>
      </section>
      <section>
        <h3>{t.guideWhyTitle}</h3>
        <ul className="guide-why">
          <li>{t.guideWhyModels}</li>
          <li>{t.guideWhyFree}</li>
          <li>{t.guideWhyCompare}</li>
          <li>{t.guideWhyRuns}</li>
        </ul>
      </section>
      <section>
        <h3>{t.guideContribTitle}</h3>
        <p>{t.guideContribP1}</p>
        <p className="guide-links">
          <a className="btn" href={ISSUE_BUG} target="_blank" rel="noreferrer">
            {t.contribBug}
          </a>
          <a className="btn" href={ISSUE_FEATURE} target="_blank" rel="noreferrer">
            {t.contribFeature}
          </a>
          <a href={REPO} target="_blank" rel="noreferrer">
            github.com/AurelienS/weather4paraglider
          </a>
        </p>
      </section>
    </article>
  );
}
