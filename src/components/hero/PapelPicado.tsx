// Papel picado — the one ornament every motif shares.
//
// Drawn rather than illustrated: an SVG built from the row's own palette costs
// no image request, scales to any width, and recolours itself per fiesta. A
// PNG would need one file per palette.
//
// preserveAspectRatio="none" is deliberate. The strip is decoration stretched
// across whatever width the hero happens to be, so the pennants distorting
// slightly on a very wide viewport is the intended behaviour, not a bug — and
// it means one viewBox works from 390px to 2560px.

const PENNANTS = 10;
const W = 100;
const H = 22;

export default function PapelPicado({ palette }: { palette: string[] }) {
  const w = W / PENNANTS;

  return (
    <svg
      className="picado"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      // Decorative. The hero's meaning is entirely in the text beside it, so
      // announcing "papel picado banner" to a screen reader adds noise, not
      // information.
      aria-hidden="true"
      focusable="false"
    >
      <line x1="0" y1="1" x2={W} y2="1" stroke="currentColor" strokeWidth="0.4" opacity="0.45" />
      {Array.from({ length: PENNANTS }, (_, i) => {
        const x = i * w;
        const fill = palette[i % palette.length];
        const mid = x + w / 2;
        return (
          <g key={i}>
            <path
              d={`M${x},1 L${x + w},1 L${x + w},${H - 8} L${mid},${H} L${x},${H - 8} Z`}
              fill={fill}
            />
            {/* Punched holes, cut through to the section ground behind. */}
            <circle cx={x + w * 0.3} cy="7" r="1.3" fill="var(--mo-ground)" />
            <circle cx={x + w * 0.7} cy="7" r="1.3" fill="var(--mo-ground)" />
            <path
              d={`M${mid},11 l2,2 l-2,2 l-2,-2 Z`}
              fill="var(--mo-ground)"
            />
          </g>
        );
      })}
    </svg>
  );
}
