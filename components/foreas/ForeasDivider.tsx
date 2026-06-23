/**
 * ForeasDivider — séparateur gradient violet→cyan
 * Extrait de "Composant graphique.svg" (charte officielle)
 */
interface ForeasDividerProps {
  className?: string;
  opacity?: number;
}

export function ForeasDivider({ className = "", opacity = 0.7 }: ForeasDividerProps) {
  return (
    <svg
      viewBox="46 12 588 6"
      height={2}
      width="100%"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
      style={{ opacity, display: "block" }}
    >
      <defs>
        <linearGradient id="foreas-divider-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8C52FF" stopOpacity="1" />
          <stop offset="50%" stopColor="#C040FF" stopOpacity="1" />
          <stop offset="100%" stopColor="#00D4FF" stopOpacity="1" />
        </linearGradient>
      </defs>
      <line
        x1="46" y1="15" x2="634" y2="15"
        stroke="url(#foreas-divider-grad)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
