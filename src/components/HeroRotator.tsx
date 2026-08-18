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

export default function HeroRotator({ views }: { views: HeroView[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

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
    const onVis = () => setPaused(document.hidden);
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
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
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
            <h1>{v.title}</h1>
            {v.script ? <div className="scr">{v.script}</div> : null}
            {v.ribbon ? <div className="ribbon">{v.ribbon}</div> : null}
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
