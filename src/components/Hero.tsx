import {
  getHeroFiesta,
  heroFocusCss,
  heroStyleVars,
  type Flyer,
} from "@/lib/fiestas";
import { heroViews, type HeroView } from "@/lib/heroViews";
import { heroMotif } from "@/lib/heroMotif";
import { heroTier, plateSources } from "@/lib/heroPlate";
import HeroRotator from "./HeroRotator";
import MotifHero from "./hero/MotifHero";
import PlateHero from "./hero/PlateHero";

// Fiesta takeover. Renders only when a dated hero fiesta carries copy.
//
// The crop is anchored to the TOP of the flyer, so the artwork shows its own
// title lockup. The live copy block is unchanged and still carries the
// headline and ribbon, but the headline is a small label rather than the
// hero's voice: the flyer already shows the event name at full size in
// Stephanie's lettering, so a second full-size copy read as a weaker duplicate
// of the thing beside it. The display type goes to the sub-line instead, which
// carries the detail the crop cuts off and is the only text here that is not
// already visible in the artwork.
//
// The script line is dropped for the same reason the headline shrank. It stays
// in the database for the email and the grid.
//
// The copy block itself is HeroRotator's, because it may alternate between
// languages. Everything around it — the section, the artwork, the colours — is
// the same for every language and stays here on the server.
function FiestaHero({ hero, views }: { hero: Flyer; views: HeroView[] }) {
  return (
    <section
      className="herofx sec"
      style={{ ...heroStyleVars(hero), "--fx-art-pos": heroFocusCss(hero.heroFocus) } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="art" src={hero.src} alt={hero.alt || hero.cap || ""} />
      <div className="wrap">
        {/* No street address here. Get Directions already does the wayfinding,
            and Find Us and the footer both carry it — a third copy in the hero
            was redundant even before hero_sub happened to hold the address too,
            which put it on screen twice. */}
        <HeroRotator views={views} variant="takeover" />
      </div>
    </section>
  );
}

// The evergreen brand hero. Unchanged — this is what renders whenever no dated
// fiesta with hero copy is live.
function BrandHero({ src, alt }: { src: string; alt: string }) {
  return (
    <section className="hero sec">
      <div className="wrap">
        <div className="grid">
          <div>
            <div className="scr">¡Bienvenidos a{"\u00A0"}Casa de Leyva!</div>
            <h1 className="pop">
              <span style={{ color: "var(--mag)" }}>WHERE</span>{" "}
              <span style={{ color: "var(--teal)" }}>EVERY</span>{" "}
              <span style={{ color: "var(--orng)" }}>DAY</span>{" "}
              <span style={{ color: "var(--purp)" }}>IS A</span>{" "}
              <span style={{ color: "var(--mag)" }}>FIESTA!</span>
            </h1>
            <div className="tagblk">
              Authentic Mexican flavors in the heart of Buckeye
            </div>
            <div className="beat">
              <span className="a">GREAT FOOD</span>
              {" · "}
              <span className="b">COLD DRINKS</span>
              {" · "}
              <span className="c">GOOD VIBES</span>
            </div>
            <div className="ctas">
              <a className="btn btn-p" href="/menu">
                See the Menu
              </a>
              <a className="btn btn-t" href="#fiestas">
                Upcoming Fiestas
              </a>
              <a className="btn btn-o" href="/rewards">
                Join Rewards
              </a>
            </div>
          </div>
          <div className="photo">
            <div className="inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function Hero() {
  const hero = await getHeroFiesta();
  const views = hero ? heroViews(hero) : [];

  // Four tiers, in order of specificity: plate, motif, flyer, brand. The
  // choice lives in lib/heroPlate so it is tested; each tier falls through to
  // the next, so a row with no plate renders exactly what it did before.
  //
  // Takeover still needs a live hero fiesta, a headline, and a usable date.
  // heroViews returns nothing without a headline, and a null `when` is how it
  // reports an unusable date. Missing any one falls back to the brand hero
  // rather than rendering a half-dressed takeover.
  const tier = hero ? heroTier(hero, views) : "brand";

  const plate = hero ? plateSources(hero) : null;

  if (hero && tier === "plate" && plate) {
    return <PlateHero hero={hero} views={views} plate={plate} />;
  }
  if (hero && tier === "motif") {
    return <MotifHero hero={hero} views={views} plan={heroMotif(hero)} />;
  }
  if (hero && tier === "flyer") {
    return <FiestaHero hero={hero} views={views} />;
  }

  return (
    <BrandHero
      src={hero?.src ?? "/images/HERO_BAR.jpg"}
      alt={hero?.alt || hero?.cap || "Inside Casa de Leyva"}
    />
  );
}
