import type { Hour } from "../api/types";
import { capeTone, compass, fmtInt, fmtPrecip, fmtT, windTone } from "../lib/format";
import { interpolate } from "../lib/i18n";
import { useI18n } from "../i18nContext";

type Props = {
  hour: Hour;
  elevationM: number;
};

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className={`stat${tone ? ` tone-${tone}` : ""}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </div>
  );
}

export function SurfaceStats({ hour, elevationM }: Props) {
  const { t, lang } = useI18n();
  const s = hour.surface;
  const ground = hour.profile[0];
  const td = ground?.td ?? null;
  const spread = s.t2m != null && td != null ? s.t2m - td : null;

  return (
    <section className="stats" aria-label={t.surfaceAria}>
      <Stat label={t.statT2m} value={fmtT(s.t2m)} />
      <Stat
        label={t.statTd2m}
        value={fmtT(td)}
        hint={spread != null ? interpolate(t.hintSpread, { x: spread.toFixed(1) }) : undefined}
      />
      <Stat label={t.statRh} value={fmtInt(s.rh2m, "%")} />
      <Stat
        label={t.statWind}
        value={s.wind10 == null ? "—" : `${s.wind10}\u00a0km/h`}
        hint={compass(s.dir10, lang)}
        tone={windTone(s.wind10)}
      />
      <Stat
        label={t.statGusts}
        value={s.gust10 == null ? "—" : `${s.gust10}\u00a0km/h`}
        tone={windTone(s.gust10)}
      />
      <Stat label={t.statCape} value={fmtInt(s.cape, "J/kg")} tone={capeTone(s.cape)} />
      <Stat label={t.statPrecip} value={fmtPrecip(s.precip)} />
      <Stat
        label={t.statCloudBase}
        value={s.cloudBaseM == null ? t.cloudNone : `${s.cloudBaseM}\u00a0m`}
        hint={
          s.cloudBaseM != null
            ? interpolate(t.hintAgl, { m: s.cloudBaseM - elevationM })
            : undefined
        }
      />
      <Stat
        label={t.statCloudCover}
        value={`${s.cloudLow ?? "—"} / ${s.cloudMid ?? "—"} / ${s.cloudHigh ?? "—"}`}
        hint={t.hintCloudLayers}
      />
      <Stat label={t.statPsfc} value={s.psfc == null ? "—" : `${s.psfc.toFixed(0)}\u00a0hPa`} />
    </section>
  );
}
