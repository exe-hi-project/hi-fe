/**
 * Logo "Hi" - rounded square, pastel blue+pink blended gradient, white text
 */
interface HiLogoProps {
  size?: number;
  className?: string;
}

export default function HiLogo({ size = 48, className = '' }: HiLogoProps) {
  const id = 'hi-logo-gradient';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a8dff0" />
          <stop offset="48%" stopColor="#d4a8e8" />
          <stop offset="100%" stopColor="#f9a8c9" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="22%" cy="22%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#c5a0d8" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Rounded square background */}
      <rect x="0" y="0" width="48" height="48" rx="13" ry="13" fill={`url(#${id})`} filter={`url(#${id}-shadow)`} />
      {/* Gloss overlay */}
      <rect x="0" y="0" width="48" height="48" rx="13" ry="13" fill={`url(#${id}-glow)`} />

      {/* "Hi" text — white, bold */}
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
        fontWeight="800"
        fontSize="22"
        fill="white"
        letterSpacing="-0.5"
      >
        Hi
      </text>
    </svg>
  );
}
