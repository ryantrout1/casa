import {
  getHeroFiesta,
  heroFocusCss,
  heroStyleVars,
  type Flyer,
} from "@/lib/fiestas";
import { heroViews, type HeroView } from "@/lib/heroViews";
import HeroRotator from "./HeroRotator";

// Fiesta takeover. Renders only when a dated hero fiesta carries copy — the
// crop is deliberately below the flyer's own title block, so the artwork shows
// and its baked-in type does not fight the live headline.
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
        <HeroRotator views={views} />
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

  // Takeover still needs all three: a live hero fiesta, a headline, and a
  // usable date. heroViews returns nothing without a headline, and a null
  // `when` is how it reports an unusable date — so this is the same guard as
  // before, asked of the view models instead of the row. Missing any one falls
  // back to the brand hero rather than rendering a half-dressed takeover.
  if (hero && views.length > 0 && views[0].when) {
    return <FiestaHero hero={hero} views={views} />;
  }

  return (
    <BrandHero
      src={hero?.src ?? "/images/HERO_BAR.jpg"}
      alt={hero?.alt || hero?.cap || "Inside Casa de Leyva"}
    />
  );
}
