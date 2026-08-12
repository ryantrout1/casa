"use client";

import { heroFocusCss, heroStyleVars } from "@/lib/heroTheme";
import type { HeroFormState } from "@/lib/heroForm";

// A scaled-down render of the real takeover. It deliberately reuses
// heroStyleVars and heroFocusCss rather than reimplementing the styling, so
// what the admin sees here cannot drift from what the homepage renders — same
// custom properties, same contrast-checked inks, same crop maths.
//
// The layout is hand-rolled at preview scale rather than reusing the .herofx
// classes: those are sized for a 540px-tall full-bleed section and would need
// a transform hack to fit here, which introduces its own drift.

// The desktop width this preview represents, and the hero's height in
// globals.css (.herofx min-height). Together they give the preview the same
// art-box ratio the live hero has at that width, which is what makes the crop
// slider mean the same thing in both places. If .herofx min-height changes,
// change HERO_HEIGHT with it.
const PREVIEW_VIEWPORT = 1440;
const HERO_HEIGHT = 540;

export default function HeroPreview({
  hero,
  flyerUrl,
  dateLine,
}: {
  hero: HeroFormState;
  flyerUrl: string;
  dateLine: string;
}) {
  const vars = heroStyleVars({
    heroBg: hero.bg || null,
    heroAccent: hero.accent || null,
    heroInk: hero.ink || null,
  });

  // Fall back to the shipped values so an untouched panel previews exactly
  // what the live hero looks like today.
  const bg = vars["--fx-bg"] ?? "#140c06";
  const ink = vars["--fx-ink"] ?? "#f7ecd4";
  const accent = vars["--fx-accent"] ?? "#ffbf1f";
  const accentInk = vars["--fx-accent-ink"] ?? "#3a2a00";
  const subOp = vars["--fx-sub-op"] ?? "1";
  const sub = vars["--fx-ink"] ?? "#cbbca0";

  return (
    <div>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: bg,
          borderRadius: 10,
          // The flyer is cropped with object-fit:cover, so what shows depends
          // on the SHAPE of this box, not its size. A fixed height made the
          // preview 2.90:1 against the hero's 1.60:1 at 1440px — it showed 26%
          // of the flyer's height where the page showed 47%, so a crop tuned
          // here did not survive to the page.
          //
          // PREVIEW_VIEWPORT is the width this stands in for. The hero's own
          // ratio is 60% of the viewport by 540px, so it changes as the window
          // does; pinning the preview to one representative desktop width
          // gives a stable target to tune against instead of a box that
          // reshapes when the admin resizes their browser.
          aspectRatio: `${PREVIEW_VIEWPORT} / ${HERO_HEIGHT}`,
          display: "flex",
          alignItems: "center",
          border: "1px solid #dfe3ea",
        }}
      >
        {flyerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={flyerUrl}
            alt=""
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              height: "100%",
              width: "60%",
              objectFit: "cover",
              objectPosition: heroFocusCss(hero.focus === "" ? null : Number(hero.focus)),
              WebkitMaskImage:
                "linear-gradient(to right,transparent 0,rgba(0,0,0,.55) 32%,#000 72%)",
              maskImage: "linear-gradient(to right,transparent 0,rgba(0,0,0,.55) 32%,#000 72%)",
            }}
          />
        ) : null}

        <div style={{ position: "relative", zIndex: 2, padding: "0 18px", maxWidth: "58%" }}>
          <div
            style={{
              fontSize: 8,
              letterSpacing: ".2em",
              color: accent,
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            {dateLine || "SATURDAY AUGUST 29 · 8 PM"}
          </div>
          <div
            style={{
              fontFamily: "'Bangers',system-ui",
              fontSize: 26,
              lineHeight: 0.95,
              color: ink,
            }}
          >
            {hero.title || "HEADLINE"}
          </div>
          {hero.script ? (
            <div
              style={{
                fontFamily: "'Pacifico',cursive",
                fontSize: 16,
                lineHeight: 1.15,
                color: accent,
              }}
            >
              {hero.script}
            </div>
          ) : null}
          {hero.ribbon ? (
            <div
              style={{
                display: "inline-block",
                background: accent,
                color: accentInk,
                fontSize: 7.5,
                letterSpacing: ".12em",
                fontWeight: 700,
                padding: "4px 10px",
                marginTop: 7,
              }}
            >
              {hero.ribbon}
            </div>
          ) : null}
          {hero.sub ? (
            <div style={{ color: sub, opacity: Number(subOp), fontSize: 9, marginTop: 7 }}>
              {hero.sub}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <span
              style={{
                background: accent,
                color: accentInk,
                fontSize: 8,
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 999,
              }}
            >
              Reserve Your Table
            </span>
            <span
              style={{
                border: `1px solid ${ink}`,
                color: ink,
                fontSize: 8,
                padding: "5px 12px",
                borderRadius: 999,
              }}
            >
              See the Menu
            </span>
          </div>
        </div>
      </div>
      <p className="hint" style={{ marginTop: 6 }}>
        Shown at {PREVIEW_VIEWPORT}px desktop width — the crop matches the live hero at that size.
        Phones use their own fixed crop, which the slider does not affect.
      </p>
    </div>
  );
}
