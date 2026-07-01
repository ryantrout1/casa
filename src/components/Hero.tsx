import { getHeroFiesta } from "@/lib/fiestas";

export default async function Hero() {
  const hero = await getHeroFiesta();
  const src = hero?.src ?? "/images/HERO_BAR.jpg";
  const alt = hero?.alt ?? "Inside Casa de Leyva";

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
              <img src={src} alt={alt} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
