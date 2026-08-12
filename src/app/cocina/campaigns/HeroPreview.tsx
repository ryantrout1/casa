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
          height: 200,
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
        Desktop crop. Phones use their own fixed crop — the slider does not affect them.
      </p>
    </div>
  );
}
