import Image from 'next/image';

/** One Art Deco corner fan (a quarter sunburst). Rotated for each corner. */
function CornerFan({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 80 80" className={className} style={style} aria-hidden>
      <g fill="none" stroke="var(--gold)" strokeWidth="1.4">
        <path d="M4 76 A72 72 0 0 1 76 4" />
        <path d="M4 60 A56 56 0 0 1 60 4" />
        <path d="M4 44 A40 40 0 0 1 44 4" />
        {[12, 24, 36, 48, 60, 72].map((a) => {
          const r = (a * Math.PI) / 180;
          return <line key={a} x1="4" y1="76" x2={4 + 72 * Math.sin(r)} y2={76 - 72 * Math.cos(r)} strokeWidth="0.8" />;
        })}
      </g>
      <circle cx="4" cy="76" r="5" fill="var(--gold)" />
    </svg>
  );
}

/**
 * The emerald cloth front cover with a gold Art Deco frame.
 * Sized with container units, so it fits any page size (a short laptop screen or a phone).
 */
export function Cover({ onOpen }: { onOpen?: () => void }) {
  const fan = { width: 'min(64px, 11cqmin)', height: 'min(64px, 11cqmin)' };
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{
        containerType: 'size',
        background:
          'radial-gradient(ellipse at 50% 35%, rgba(255,255,255,.08), transparent 60%), repeating-linear-gradient(45deg, rgba(0,0,0,.04) 0 2px, transparent 2px 5px), linear-gradient(160deg, #23706b, #174845 70%, #113533)',
        color: 'var(--paper)',
        boxShadow: 'inset 6px 0 14px rgba(0,0,0,.35)',
      }}
    >
      <div className="pointer-events-none absolute inset-[14px] border-[1.5px] border-gold" />
      <div className="pointer-events-none absolute inset-[20px] border border-gold/70" />
      <CornerFan className="absolute bottom-[20px] left-[20px]" style={fan} />
      <CornerFan className="absolute bottom-[20px] right-[20px] -scale-x-100" style={fan} />
      <CornerFan className="absolute left-[20px] top-[20px] -scale-y-100" style={fan} />
      <CornerFan className="absolute right-[20px] top-[20px] -scale-100" style={fan} />

      <p className="font-display italic text-gold" style={{ fontSize: 'clamp(0.75rem, 3.2cqmin, 0.95rem)' }}>Class 10 Science</p>
      <div
        className="relative rounded-full border-[1.5px] border-gold bg-paper/95 shadow-[0_0_0_6px_rgba(201,162,74,.25)]"
        style={{ width: 'min(190px, 30cqh, 46cqw)', height: 'min(190px, 30cqh, 46cqw)', marginTop: '3cqh' }}
      >
        <Image src="/logo.png" alt="" fill sizes="190px" className="object-contain p-[10%]" priority />
      </div>
      <h1 className="font-display leading-none" style={{ fontSize: 'clamp(1.8rem, min(10cqw, 8cqh), 3.75rem)', marginTop: '3.5cqh' }}>
        VigyanVerse
        <span className="block italic text-gold" style={{ fontSize: '0.5em', marginTop: '0.25em' }}>AI</span>
      </h1>
      <p className="mx-auto max-w-[24ch] leading-snug text-paper/85" style={{ fontSize: 'clamp(0.8rem, 3.2cqmin, 0.98rem)', marginTop: '3cqh' }}>
        Physics, Chemistry and Biology, explained simply
      </p>
      {onOpen && (
        <button type="button" onClick={onOpen} className="rounded-full border border-gold px-5 py-1.5 font-display italic text-gold transition hover:bg-gold hover:text-emerald-deep" style={{ marginTop: '4cqh' }}>
          Open the book
        </button>
      )}
    </div>
  );
}
