/** Yin–yang brand mark drawn inline (no image request, crisp at any size). */
export default function TaijiMark({ size = 32, className, dark = "#1f6b5a", light = "#f5f3ee" }: {
  size?: number; className?: string; dark?: string; light?: string;
}) {
  return <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle cx="50" cy="50" r="48" fill={dark} />
    <path d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2Z" fill={light} />
    <circle cx="50" cy="26" r="7" fill={light} />
    <circle cx="50" cy="74" r="7" fill={dark} />
    <circle cx="50" cy="50" r="48" fill="none" stroke={dark} strokeWidth="3" />
  </svg>;
}
