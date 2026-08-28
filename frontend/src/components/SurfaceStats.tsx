import type { Hour } from "../api/types";
import { capeTone, compass, fmtInt, fmtPrecip, fmtT, windTone } from "../lib/format";

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
  const s = hour.surface;
  const ground = hour.profile[0];
  const td = ground?.td ?? null;
  const spread = s.t2m != null && td != null ? s.t2m - td : null;

  return (
    <section className="stats" aria-label="Surface">
      <Stat label="T 2 m" value={fmtT(s.t2m)} />
      <Stat label="Td 2 m" value={fmtT(td)} hint={spread != null ? `T−Td ${spread.toFixed(1)} K` : undefined} />
      <Stat label="RH" value={fmtInt(s.rh2m, "%")} />
      <Stat
        label="Wind 10 m"
        value={s.wind10 == null ? "—" : `${s.wind10}\u00a0km/h`}
        hint={compass(s.dir10)}
        tone={windTone(s.wind10)}
      />
      <Stat
        label="Gusts"
        value={s.gust10 == null ? "—" : `${s.gust10}\u00a0km/h`}
        tone={windTone(s.gust10)}
      />
      <Stat label="CAPE" value={fmtInt(s.cape, "J/kg")} tone={capeTone(s.cape)} />
      <Stat label="Precip." value={fmtPrecip(s.precip)} />
      <Stat
        label="Cloud base"
        value={s.cloudBaseM == null ? "none" : `${s.cloudBaseM}\u00a0m`}
        hint={s.cloudBaseM != null ? `+${s.cloudBaseM - elevationM}\u00a0m AGL` : undefined}
      />
      <Stat
        label="Cloud cover"
        value={`${s.cloudLow ?? "—"} / ${s.cloudMid ?? "—"} / ${s.cloudHigh ?? "—"}`}
        hint="low / mid / high %"
      />
      <Stat label="P sfc" value={s.psfc == null ? "—" : `${s.psfc.toFixed(0)}\u00a0hPa`} />
    </section>
  );
}
