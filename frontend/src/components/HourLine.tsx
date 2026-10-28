import { useLayoutEffect, useRef, useState } from "react";
import { hourLabel, hourOfDay } from "../lib/format";

type Props = {
  hours: readonly { time: string }[];
  /** ISO time of the hour currently drawn. */
  current: string;
  label: string;
  onSelect: (time: string) => void;
};

/** Hours of the day on one line. The dot sits on the hour being shown. */
export function HourLine({ hours, current, label, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mark, setMark] = useState<number | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const place = () => {
      const btn = root.querySelector<HTMLElement>("button.is-on");
      if (!btn) return;
      setMark(btn.offsetLeft + btn.offsetWidth / 2);
      const scroll = root.parentElement;
      if (!scroll) return;
      const viewLeft = scroll.scrollLeft;
      const viewRight = viewLeft + scroll.clientWidth;
      const btnRight = btn.offsetLeft + btn.offsetWidth;
      if (btn.offsetLeft >= viewLeft && btnRight <= viewRight + 1) return;
      const max = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
      const next = btn.offsetLeft - (scroll.clientWidth - btn.offsetWidth) / 2;
      scroll.scrollLeft = Math.min(max, Math.max(0, next));
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(root);
    if (root.parentElement) ro.observe(root.parentElement);
    return () => ro.disconnect();
  }, [current, hours]);

  return (
    <div className="hour-line-scroll">
      <div className="hour-line" role="group" aria-label={label} ref={ref}>
        <span className="hour-line-bar" aria-hidden="true" />
        <span
          className={mark == null ? "hour-line-mark" : "hour-line-mark is-on"}
          style={{ left: mark ?? 0 }}
          aria-hidden="true"
        />
        {hours.map((h) => {
          const on = h.time === current;
          return (
            <button
              key={h.time}
              type="button"
              className={on ? "is-on" : undefined}
              aria-current={on ? "true" : undefined}
              aria-label={hourLabel(h.time)}
              onClick={() => onSelect(h.time)}
            >
              {String(hourOfDay(h.time)).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
