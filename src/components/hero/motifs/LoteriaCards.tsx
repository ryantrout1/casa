import { LOTERIA_DECK, type Shape } from "@/lib/loteriaDeck";
import type { LoteriaCard } from "@/lib/heroMotif";

// One flank of lotería cards. The deck decides what a card looks like; this
// only turns that data into SVG and stacks it.
//
// The whole group is aria-hidden. These are ornament: the hero's meaning is in
// the headline, the date and the buttons, and announcing "El Sol, La Rosa" to a
// screen reader would add two proper nouns that mean nothing without the
// picture. The card names remain visible as printed text for sighted readers,
// which is what a real card does too.

const CARD_W = 76;
const CARD_H = 108;
const PANEL = { x: 5, y: 15, size: 66 };

function draw(s: Shape, i: number) {
  if (s.k === "circle") {
    return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} />;
  }
  if (s.k === "rect") {
    return (
      <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx ?? 0} fill={s.fill} />
    );
  }
  return (
    <path
      key={i}
      d={s.d}
      // A path with no explicit fill defaults to black in SVG, which on a
      // stroke-only shape like the sun's rays would paint a solid blob across
      // the panel rather than drawing lines.
      fill={s.fill ?? "none"}
      stroke={s.stroke}
      strokeWidth={s.w}
      strokeLinecap="round"
    />
  );
}

export default function LoteriaCards({
  cards,
  side,
}: {
  cards: LoteriaCard[];
  side: "l" | "r";
}) {
  if (cards.length === 0) return null;

  return (
    <div className={`side side-${side}`} aria-hidden="true">
      {cards.map((c, i) => {
        const art = LOTERIA_DECK[c];
        // Unique per card: several cards render in the same document and a
        // shared id would make every panel clip to whichever one the browser
        // resolved first.
        const clipId = `lot-${side}-${i}`;
        return (
          <svg
            key={c}
            className="card"
            viewBox={`0 0 ${CARD_W} ${CARD_H}`}
            // Alternating tilt, mirrored per side, so a pair leans away from
            // the copy rather than both leaning the same way.
            style={{
              transform: `rotate(${(side === "l" ? -1 : 1) * (i % 2 === 0 ? 7 : 3)}deg)`,
            }}
            focusable="false"
          >
            <rect
              x="0"
              y="0"
              width={CARD_W}
              height={CARD_H}
              rx="3"
              fill="#fdf6e4"
              stroke="#c9b892"
              strokeWidth="0.5"
            />
            <text x="6" y="11" fontSize="7.5" fill="#8a7a55" fontFamily="Mulish, sans-serif">
              {art.n}
            </text>
            <rect
              x={PANEL.x}
              y={PANEL.y}
              width={PANEL.size}
              height={PANEL.size}
              fill={art.panel}
            />
            {/* Shapes are authored in a 0..66 panel space, so one translate
                puts every card's art in the right place without the deck
                needing to know where the panel sits on the card. */}
            <g transform={`translate(${PANEL.x} ${PANEL.y})`} clipPath={`url(#${clipId})`}>
              {art.shapes.map(draw)}
            </g>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={PANEL.size} height={PANEL.size} />
            </clipPath>
            <text
              x={CARD_W / 2}
              y="97"
              fontSize="11"
              fill="#2c2c2a"
              textAnchor="middle"
              fontFamily="Bangers, cursive"
            >
              {art.name}
            </text>
          </svg>
        );
      })}
    </div>
  );
}
