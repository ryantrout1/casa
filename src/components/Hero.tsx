import { getHeroFiesta, heroWhen, type Flyer, type HeroWhen } from "@/lib/fiestas";

const PHONE = "623-306-2386";

// Fiesta takeover. Renders only when a dated hero fiesta carries copy — the
// crop is deliberately below the flyer's own title block, so the artwork shows
// and its baked-in type does not fight the live headline.
function FiestaHero({ hero, when }: { hero: Flyer; when: HeroWhen }) {
  const line = [`${when.day} ${when.date}`, when.time].filter(Boolean).join(" · ");

  return (
    <section className="herofx sec">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="art" src={hero.src} alt={hero.alt || hero.cap || ""} />
      <div className="wrap">
        <div className="copy">
          <div className="when">{line}</div>
          <h1>{hero.heroTitle}</h1>
          {hero.heroScript ? <div className="scr">{hero.heroScript}</div> : null}
          {hero.heroRibbon ? <div className="ribbon">{hero.heroRibbon}</div> : null}
          {hero.heroSub ? <div className="sub">{hero.heroSub}</div> : null}
          <div className="ctas">
            <a className="btn btn-y" href={`tel:${PHONE}`}>
              Reserve Your Table
            </a>
            <a className="btn btn-ghost" href="/menu">
              See the Menu
            </a>
          </div>
        </div>
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
  const when = hero ? heroWhen(hero.startsAt, hero.eventDate, hero.heroLang) : null;

  // Takeover needs all three: a live hero fiesta, a headline, and a usable
  // date. Missing any one falls back to the brand hero rather than rendering a
  // half-dressed takeover.
  if (hero && hero.heroTitle && when) {
    return <FiestaHero hero={hero} when={when} />;
  }

  return (
    <BrandHero
      src={hero?.src ?? "/images/HERO_BAR.jpg"}
      alt={hero?.alt || hero?.cap || "Inside Casa de Leyva"}
    />
  );
}
