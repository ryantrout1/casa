import {
  getHeroFiesta,
  heroFocusCss,
  heroStyleVars,
  type Flyer,
} from "@/lib/fiestas";
import { heroViews, type HeroView } from "@/lib/heroViews";
import { heroMotif } from "@/lib/heroMotif";
import { heroTier, plateSources } from "@/lib/heroPlate";
import { ENTRANCE, beatDelay, ms, typeDelay, wordDelay } from "@/lib/heroEntrance";
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

// Custom properties the entrance CSS reads: --d is when a piece starts, --dur
// how long it takes. The numbers come from lib/heroEntrance so they are tested.
const at = (startMs: number, durMs?: number) =>
  ({ "--d": ms(startMs), ...(durMs ? { "--dur": ms(durMs) } : {}) }) as React.CSSProperties;

const HEADLINE = [
  { word: "WHERE", color: "var(--mag)" },
  { word: "EVERY", color: "var(--teal)" },
  { word: "DAY", color: "var(--orng)" },
  { word: "IS A", color: "var(--purp)" },
];

const RIBBON = "Authentic Mexican flavors in the heart of Buckeye";

// The evergreen brand hero. This is what renders whenever no dated fiesta with
// hero copy is live.
//
// `in` turns on the one-time entrance in globals.css. Every animated piece
// carries its own --d, and nothing here changes after the first paint, so the
// entrance cannot replay. Only transform, opacity and clip-path move, so the
// section is the same height before, during and after. The ribbon is split
// one span per character for the typing effect; its text content, and so its
// accessible name, is unchanged.
function BrandHero({ src, alt }: { src: string; alt: string }) {
  const ribbon = [...RIBBON];
  return (
    <section className="hero in sec">
      <div className="wrap">
        <div className="grid">
          <div>
            <div className="scr" style={at(ENTRANCE.script.startMs, ENTRANCE.script.durMs)}>
              ¡Bienvenidos a{"\u00A0"}Casa de Leyva!
            </div>
            <h1 className="pop">
              {HEADLINE.map((h, i) => (
                <span key={h.word}>
                  <span
                    className="w"
                    style={{ color: h.color, ...at(wordDelay(i), ENTRANCE.words.durMs) }}
                  >
                    {h.word}
                  </span>{" "}
                </span>
              ))}
              <span
                className="w fiesta"
                style={{ color: "var(--mag)", ...at(ENTRANCE.fiesta.startMs, ENTRANCE.fiesta.durMs) }}
              >
                FIESTA!
              </span>
            </h1>
            <div className="tagblk" style={at(ENTRANCE.ribbon.startMs, ENTRANCE.ribbon.durMs)}>
              {ribbon.map((ch, i) => (
                <span key={i} className="ch" style={at(typeDelay(i, ribbon.length))}>
                  {ch}
                </span>
              ))}
            </div>
            <div className="beat">
              <span className="a" style={at(beatDelay(0), ENTRANCE.beat.durMs)}>
                GREAT FOOD
              </span>
              <span className="sep" style={at(beatDelay(1), ENTRANCE.beat.durMs)}>
                {" · "}
              </span>
              <span className="b" style={at(beatDelay(1), ENTRANCE.beat.durMs)}>
                COLD DRINKS
              </span>
              <span className="sep" style={at(beatDelay(2), ENTRANCE.beat.durMs)}>
                {" · "}
              </span>
              <span className="c" style={at(beatDelay(2), ENTRANCE.beat.durMs)}>
                GOOD VIBES
              </span>
            </div>
            <div className="ctas" style={at(ENTRANCE.ctas.startMs, ENTRANCE.ctas.durMs)}>
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
