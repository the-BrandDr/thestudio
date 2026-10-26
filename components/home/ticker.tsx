// components/home/ticker.tsx
export default function StudioTicker() {
  const items = [
    'Event Branding',
    'Stage Scenography',
    'Arrival Tunnels',
    'Spatial Identity',
    '360 Photobooth Sets',
    'Credential Systems',
    'Brand Architecture',
    'The Life In Every Place',
  ];

  return (
    <div className="w-full overflow-hidden py-5 select-none bg-[var(--bg-card)]/40">
      <div className="animate-marquee flex items-center gap-8 text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-dim)]">
        {items.concat(items).map((item, idx) => (
          <span key={idx} className="flex items-center gap-8">
            <span className="hover:text-[var(--text-primary)] transition-colors cursor-default">
              {item}
            </span>
            <span className="text-[var(--brand-primary)] text-[8px]">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}