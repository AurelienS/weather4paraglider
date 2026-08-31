import { useMemo, useState } from "react";
import { groupByDay, dayLabel, utcSlot } from "../lib/format";
import { meteoHoursForDay } from "../lib/meteogram";
import { interpolate } from "../lib/i18n";
import type { AromeResponse } from "../api/types";
import { soundingAvailable } from "../api/pipeline";
import { useI18n } from "../i18nContext";
import type { View } from "../stores/types";
import { Meteogram } from "./Meteogram";
import { Sounding } from "./Sounding";
import { SurfaceStats } from "./SurfaceStats";
import { Windgram } from "./Windgram";

type Props = {
  /** The averaged payload (shaped like a model response). */
  data: AromeResponse;
  /** How many models the mean covers. */
  count: number;
  dayKey: string | null;
  hourTime: string | null;
  view: View;
  zMax: number;
  compact: boolean;
};

/** The model board's averaged card: always first, never removable — it is
 * derived from the loaded model cards, not a board entry. */
export function AverageCard({ data, count, dayKey, hourTime, view, zMax, compact }: Props) {
  const { t, lang } = useI18n();
  const [activeZ, setActiveZ] = useState<number | null>(null);
  const days = useMemo(() => groupByDay(data.hours, lang), [data, lang]);
  const effDay = dayKey != null && days.some((d) => d.key === dayKey) ? dayKey : days[0]?.key;
  const hours = days.find((d) => d.key === effDay)?.hours ?? [];
  const hour = (hourTime && hours.find((h) => h.time === hourTime)) || hours[0];

  return (
    <section className="board-card is-average" aria-label={t.boardAverage}>
      <div className="board-card-head">
        <span className="board-card-name">
          {t.boardAverage} ({count})
        </span>
      </div>
      {view === "windgram" ? (
        hours.length > 0 ? (
          <Windgram hours={hours} elevationM={data.modelElevationM} zMax={zMax} compact={compact} />
        ) : (
          <p className="board-card-note">{t.noDataDay}</p>
        )
      ) : view === "meteogram" ? (
        meteoHoursForDay(data.hours, effDay ?? "").length > 0 ? (
          <Meteogram
            hours={meteoHoursForDay(data.hours, effDay ?? "")}
            elevationM={data.modelElevationM}
            compact={compact}
          />
        ) : (
          <p className="board-card-note">{t.noDataDay}</p>
        )
      ) : !soundingAvailable(data) ? (
        <p className="board-card-note">{t.soundingUnavailable}</p>
      ) : hour ? (
        <>
          <SurfaceStats hour={hour} elevationM={data.modelElevationM} />
          <Sounding
            hour={hour}
            elevationM={data.modelElevationM}
            activeZ={activeZ}
            onActiveZ={setActiveZ}
          />
        </>
      ) : (
        <p className="board-card-note">{t.noDataDay}</p>
      )}
      <p className="board-card-foot">
        {interpolate(t.pinRun, {
          day: dayLabel(data.runInitUtc, lang),
          slot: utcSlot(data.runInitUtc),
        })}{" "}
        · {interpolate(t.boardModels, { n: count })}
      </p>
    </section>
  );
}
