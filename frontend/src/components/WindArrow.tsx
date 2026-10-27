type Props = {
  dir: number;
  speed: number;
  /** Wind ink, already adjusted so it clears the cell background. */
  color: string;
  /** Neutral rim that separates the shaft from the cell. */
  edge: string;
};

/** Needle aimed up, offsets from its center. Tip is negative y. */
const NEEDLE: ReadonlyArray<readonly [number, number]> = [
  [0, -12.6],
  [3.05, -5.2],
  [1.05, -4.2],
  [1.05, 11.4],
  [-1.05, 11.4],
  [-1.05, -4.2],
  [-3.05, -5.2],
];

/** Filled needle in a local box. `scale` 1 matches the 32px windgram glyph. */
function windNeedlePath(cx: number, cy: number, scale: number): string {
  const cmds = NEEDLE.map(([dx, dy], i) => {
    const x = (cx + dx * scale).toFixed(2);
    const y = (cy + dy * scale).toFixed(2);
    return `${i === 0 ? "M" : "L"}${x} ${y}`;
  });
  return `${cmds.join(" ")} Z`;
}

/**
 * Two center lines stay first so contrast checks can read the ink from the
 * second stroke. They sit inside the needle, which is the mark actually drawn.
 */
export function WindNeedle({
  cx,
  cy,
  scale,
  color,
}: {
  cx: number;
  cy: number;
  scale: number;
  color: string;
}) {
  const y1 = cy + 8.2 * scale;
  const y2 = cy - 2.4 * scale;
  const sw = 0.9 * scale;
  return (
    <>
      <line x1={cx} y1={y1} x2={cx} y2={y2} stroke={color} strokeWidth={sw} />
      <line x1={cx} y1={y1} x2={cx} y2={y2} stroke={color} strokeWidth={sw} />
      <path d={windNeedlePath(cx, cy, scale)} fill={color} />
    </>
  );
}

export function WindArrow({ dir, speed, color, edge }: Props) {
  if (speed < 1.5) {
    return (
      <svg className="warrow" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="1.7" fill={color} />
        <circle cx="16" cy="16" r="2.7" fill="none" stroke={edge} strokeWidth="0.7" />
      </svg>
    );
  }
  const rot = dir + 180;
  return (
    <svg className="warrow" viewBox="0 0 32 32" aria-hidden>
      <g transform={`rotate(${rot} 16 16)`}>
        <WindNeedle cx={16} cy={16} scale={1} color={color} />
      </g>
    </svg>
  );
}
