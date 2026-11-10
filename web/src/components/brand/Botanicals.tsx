// Line-art sprigs echoing the emblem's two sides, drawn in currentColor so CSS picks the tone:
// gold leaves on the dusk side, rose blossoms on the dawn side. Purely decorative.

export function LeafSprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 200" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M20 196C40 150 58 100 98 8" />
      {[
        [30, 168, -1],
        [38, 148, 1],
        [47, 126, -1],
        [56, 104, 1],
        [66, 82, -1],
        [76, 60, 1],
        [86, 38, -1],
      ].map(([x, y, side], i) => (
        <path
          key={i}
          d={side < 0 ? `M${x} ${y}c-18-2-30-12-34-26 16 0 28 10 34 26z` : `M${x} ${y}c16-8 24-22 22-36-14 6-22 20-22 36z`}
        />
      ))}
      <path d="M98 8c-10 4-14 12-12 22 8-6 12-13 12-22z" />
    </svg>
  );
}

function Blossom({ x, y, r }: { x: number; y: number; r: number }) {
  const petals = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180);
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    return <ellipse key={i} cx={px} cy={py} rx={r * 0.62} ry={r * 0.45} transform={`rotate(${i * 72} ${px} ${py})`} />;
  });
  return (
    <g>
      {petals}
      <circle cx={x} cy={y} r={r * 0.28} />
    </g>
  );
}

export function BlossomSprig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 200" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M100 196C84 150 70 104 30 10" />
      <path d="M78 140c10-14 26-18 36-14M62 98c-14-8-30-6-38 2M52 70c10-12 24-14 32-10" />
      <path d="M86 160c-16 0-26-8-30-20 14-2 24 6 30 20zM70 118c14-4 24 0 30 10-12 4-22 0-30-10z" />
      <Blossom x={36} y={20} r={9} />
      <Blossom x={22} y={100} r={7} />
      <Blossom x={86} y={58} r={8} />
      <Blossom x={112} y={124} r={6} />
    </svg>
  );
}
