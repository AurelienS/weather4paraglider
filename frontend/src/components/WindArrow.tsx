type Props = {
  dir: number;
  speed: number;
  color: string;
};

export function WindArrow({ dir, speed, color }: Props) {
  if (speed < 1.5) {
    return (
      <svg className="warrow" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="3.4" fill={color} />
      </svg>
    );
  }
  const rot = dir + 180;
  const w = 2.8 + Math.min(speed, 80) / 16;
  return (
    <svg className="warrow" viewBox="0 0 32 32" aria-hidden>
      <g transform={`rotate(${rot} 16 16)`}>
        <line
          x1="16"
          y1="28"
          x2="16"
          y2="9"
          stroke={color}
          strokeWidth={w}
          strokeLinecap="round"
        />
        <polygon points="16,3 7.5,15 24.5,15" fill={color} />
      </g>
    </svg>
  );
}
