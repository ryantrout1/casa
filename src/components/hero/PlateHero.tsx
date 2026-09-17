import type { Flyer } from "@/lib/fiestas";
import type { HeroView } from "@/lib/heroViews";
import { PLATE_BREAKPOINT, plateStyleVars, type PlateSources } from "@/lib/heroPlate";
import HeroRotator from "../HeroRotator";

// The plate takeover. A text-free background image generated from the flyer
// fills the whole hero, a fixed shade darkens the copy zone, and the live copy
// sits over it at full display size. Unlike FiestaHero there is no poster
// lettering on screen to compete with, so the headline is the hero's voice
// again and the script line comes back.
//
// It wears .herofx so the rotator, eyebrow, ribbon and button rules apply
// unchanged; .plate overrides only layout and type size. Every decision about
// what to draw was made by lib/heroPlate.

export default function PlateHero({
  hero,
  views,
  plate,
}: {
  hero: Flyer;
  views: HeroView[];
  plate: PlateSources;
}) {
  return (
    <section
      className="herofx plate sec"
      style={{ ...plateStyleVars(hero), "--fx-plate-pos": plate.pos } as React.CSSProperties}
    >
      <picture className="plate-art">
        {plate.mobile ? (
          <source media={`(max-width: ${PLATE_BREAKPOINT}px)`} srcSet={plate.mobile} />
        ) : null}
        {/* Decorative: the event is named in the live copy, and the poster
            itself is one click away with its own description. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={plate.desktop} alt="" fetchPriority="high" decoding="async" />
      </picture>
      <div className="shade" aria-hidden="true" />
      <div className="wrap">
        <HeroRotator
          views={views}
          flyer={{ src: hero.src, alt: hero.alt || hero.cap || "" }}
        />
      </div>
    </section>
  );
}
