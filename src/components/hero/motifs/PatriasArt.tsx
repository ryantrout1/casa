import { ATTRACTION_ART, BURST_RAYS, burstRay } from "@/lib/patriasArt";
import type { Shape } from "@/lib/motifShapes";
import type { AttractionIcon, MotifPlan } from "@/lib/heroMotif";
import { pickInk } from "@/lib/palette";

// Fiestas Patrias ornament: a firework burst on each flank, and a row of badges
// naming what is happening at the event.
//
// Both are palette-driven, unlike the lotería deck. A firework has no canonical
// colour and neither does a badge, so taking the flyer's is right; a lotería
// card does, which is why El Sol stays yellow whatever the poster looks like.

function draw(s: Shape, i: number, color: string) {
  const fill = (v?: string) => (v === "currentColor" ? color : v);
  if (s.k === "circle") {
    return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={fill(s.fill)} />;
  }
  if (s.k === "rect") {
    return (
      <rect
        key={i}
        x={s.x}
        y={s.y}
        width={s.w}
        height={s.h}
        rx={s.rx ?? 0}
        fill={fill(s.fill)}
      />
    );
  }
  return (
    <path
      key={i}
      d={s.d}
      // Unfilled paths default to black in SVG, which would turn the taco's
      // open shell into a solid blob.
      fill={s.fill ? fill(s.fill) : "none"}
      stroke={fill(s.stroke)}
      strokeWidth={s.w}
      strokeLinecap="round"
    />
  );
}

export function FireworkBurst({ color, side }: { color: string; side: "l" | "r" }) {
  return (
    <div className={`side side-${side}`} aria-hidden="true">
      <svg className="burst" viewBox="0 0 48 48" focusable="false">
        {Array.from({ length: BURST_RAYS }, (_, i) => {
          const { d, tipX, tipY } = burstRay(i);
          return (
            <g key={i}>
              <path d={d} stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <circle cx={tipX} cy={tipY} r="2.2" fill={color} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function AttractionIcons({
  icons,
  plan,
}: {
  icons: AttractionIcon[];
  plan: Extract<MotifPlan, { motif: "patrias" }>;
}) {
  // Badge colours skip palette[0] — that is the section ground, and a badge
  // painted in it would be an invisible disc with a floating glyph.
  const badges = plan.palette.slice(1);

  return (
    <div className="mo-icons">
      {icons.map((ic, i) => {
        const art = ATTRACTION_ART[ic];
        const badge = badges[i % badges.length];
        // pickInk already guarantees a readable foreground for any background,
        // so the glyph cannot disappear into its own badge whatever the flyer.
        const glyph = pickInk(badge);
        return (
          <div className="mo-icon" key={ic}>
            <svg viewBox="0 0 60 60" aria-hidden="true" focusable="false">
              <circle cx="30" cy="30" r="26" fill={badge} />
              <g transform="translate(16 16)">
                {art.shapes.map((s, n) => draw(s, n, glyph))}
              </g>
            </svg>
            <span style={{ color: plan.ink }}>{art.label}</span>
          </div>
        );
      })}
    </div>
  );
}
