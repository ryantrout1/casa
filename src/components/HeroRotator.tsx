"use client";

import { useEffect, useState } from "react";
import { ROTATE_MS, FADE_MS, type HeroView } from "@/lib/heroViews";

// The takeover's copy block, alternating between languages.
//
// Every decision about WHAT to render was made server-side by heroViews; this
// component only holds an index. That split is deliberate — the repo has no
// jsdom, so anything decided in here could not be unit-tested, and everything
// worth testing lives in the pure module instead.
//
// Both language blocks are always mounted, stacked in one CSS grid cell. The
// inactive one is transparent but still in flow, so the section is always as
// tall as the longer language and nothing below the hero moves when the copy
// swaps. On desktop `.herofx` has min-height:540px which would hide that; on
// mobile it does not, which is where the layout jump would otherwise show.

const DIRECTIONS_HREF =
  "https://www.google.com/maps/dir/?api=1&destination=424+E+Monroe+Ave%2C+Buckeye%2C+AZ+85326";

/**
 * The headline, painted one colour per letter when the motif supplies them.
 *
 * Falls back to a plain string whenever the colours are absent or disagree
 * with the title's length. That fallback is the whole safety story here: the
 * flyer takeover passes nothing and is unaffected, and a mismatch renders a
 * correct single-colour headline rather than a word missing its tail.
 *
 * Split on NFC code points, matching how heroMotif counted them — splitting
 * the two ways differently is exactly how the accent would end up wearing the
 * colour meant for the letter after it.
 *
 * Every code point gets a span, spaces included. That is safe rather than
 * ideal: the h1's text content is byte-identical to the plain-string version,
 * so its accessible name does not change and assistive technology still reads
 * whole words. A coloured space renders nothing either way.
 */
function renderTitle(title: string, colors?: string[]) {
  const chars = [...title.normalize("NFC")];
  if (!colors || colors.length !== chars.length) return title;
  return chars.map((ch, i) => (
    <span key={i} style={{ color: colors[i] }}>
      {ch}
    </span>
  ));
}

export default function HeroRotator({
  views,
  titleColors,
  variant = "full",
}: {
  views: HeroView[];
  /**
   * "full" renders the whole copy block. "caption" drops the headline, script
   * and ribbon — used by the flyer takeover, where all three are legible in the
   * artwork itself and repeating them in HTML makes the page look like a
   * fallback for an image that already loaded.
   *
   * They stay in the database either way: the campaign email, the fiestas grid
   * and the page title all still read them.
   */
  variant?: "full" | "caption";
  /**
   * One colour array per view, for the motif hero's multicolour headline.
   * Omitted by the flyer takeover, which paints the whole headline in
   * --fx-ink. An array whose length disagrees with its title is ignored
   * rather than applied partway — heroMotif guarantees agreement, and
   * ignoring is the safe answer if that ever stops being true.
   */
  titleColors?: string[][];
}) {
  const [i, setI] = useState(0);
  const [reduced, setReduced] = useState(false);

  // Three independent reasons to hold, tracked separately rather than folded
  // into one `paused` boolean. Sharing one flag lets any of them cancel the
  // others: moving the mouse off the block would clear a pause that a KEYBOARD
  // user's focus had set, and the rotation would then mark the block they are
  // focused inside `inert` — dropping their focus to the document body.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const paused = hovered || focused || hidden;

  // Someone who asked their device for less motion gets the primary language,
  // held. Read in an effect rather than at module scope so the server render
  // and the first client render agree.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // A backgrounded tab should not be burning through cycles; more to the
  // point, coming back to a half-faded hero looks broken.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Keyed on `i` so each hold is its own timeout: pausing mid-cycle and
  // resuming gives the visitor a full interval to read from, rather than
  // dropping them into the tail of the one they interrupted.
  //
  // With a single view no timer is ever registered at all — which is every
  // fiesta that has no translation, i.e. all of them today.
  useEffect(() => {
    if (views.length < 2 || paused || reduced) return;
    const id = setTimeout(() => setI((n) => (n + 1) % views.length), ROTATE_MS);
    return () => clearTimeout(id);
  }, [i, views.length, paused, reduced]);

  // An index left over from a longer list would render nothing at all.
  const active = i < views.length ? i : 0;

  return (
    <div
      className="rot"
      style={{ "--fx-fade": `${FADE_MS}ms` } as React.CSSProperties}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {views.map((v, n) => {
        const on = n === active;
        return (
          <div
            key={v.lang}
            className={on ? "copy on" : "copy"}
            lang={v.lang}
            aria-hidden={!on}
            inert={!on}
          >
            {v.when ? <div className="when">{v.when}</div> : null}
            {variant === "full" ? (
              <>
                <h1>{renderTitle(v.title, titleColors?.[n])}</h1>
                {v.script ? <div className="scr">{v.script}</div> : null}
                {v.ribbon ? <div className="ribbon">{v.ribbon}</div> : null}
              </>
            ) : null}
            {v.sub ? <div className="sub">{v.sub}</div> : null}
            <div className="ctas">
              <a
                className="btn btn-y"
                href={DIRECTIONS_HREF}
                target="_blank"
                rel="noopener noreferrer"
              >
                {v.ctas.directions}
              </a>
              <a className="btn btn-ghost" href="/menu">
                {v.ctas.menu}
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
