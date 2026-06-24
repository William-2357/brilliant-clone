interface Props {
  size?: number;
  className?: string;
}

/**
 * "The Long Run" mark — a logarithmic learning curve that climbs quickly and
 * then stabilizes onto its asymptote: a value converging in the long run. Drawn
 * white on an accent tile, with the fill from `--accent` so it adapts to the
 * light/dark theme. The faint L-axis makes it read as a small graph.
 */
export default function Logo({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="The Long Run"
    >
      <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--hero-bg)" />
      <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4.5V19H20" strokeWidth="1.4" opacity="0.5" />
        <path d="M5 17.8C7 10 12 8 20 7.6" strokeWidth="2.1" />
      </g>
    </svg>
  );
}
