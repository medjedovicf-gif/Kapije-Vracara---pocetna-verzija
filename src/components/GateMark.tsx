export function GateMark({ className = 'w-8 h-8', dark = false }: { className?: string; dark?: boolean }) {
  const stroke = dark ? '#10152A' : '#ffffff';
  return (
    <svg viewBox="0 0 64 64" className={className}>
      <path
        d="M12 54 L12 26 Q12 12 32 12 Q52 12 52 26 L52 54"
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M12 54 L52 54" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <rect x="27" y="34" width="10" height="20" rx="2" fill="#E4B23C" />
    </svg>
  );
}
