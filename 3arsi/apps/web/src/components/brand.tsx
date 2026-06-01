import Link from 'next/link';

export function Logo({ size = 40, light = false }: { size?: number; light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <span
        className="grid place-items-center rounded-full border-2 border-gold font-head font-bold text-gold"
        style={{ width: size, height: size, background: light ? 'transparent' : '#6E1F26' }}
      >
        3A
      </span>
      <span className={`font-head text-2xl font-bold ${light ? 'text-cream' : 'text-burgundy'}`}>3ARSI</span>
    </Link>
  );
}

export function GoldDivider({ className = '' }: { className?: string }) {
  return <div className={`divider-gold ${className}`} />;
}
