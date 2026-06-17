import FiestaGallery, { FlyerItem } from "@/components/FiestaGallery";

const HOMEPAGE_FLYERS: FlyerItem[] = [
  { img: "FLY_MXKOREA", alt: "México vs South Korea watch party — Thursday June 18", cap: "México vs South Korea" },
  { img: "FLY_FIFA", alt: "FIFA is Coming — watch every match with us", cap: "FIFA Watch Parties" },
  { img: "FLY_LOTERIA", alt: "Lotería Night", cap: "Lotería Night" },
  { img: "FLY_TACOTUE", alt: "Taco Tuesdays", cap: "Taco Tuesdays" },
  { img: "FLY_CINCO", alt: "Cinco de Mayo", cap: "Cinco de Mayo" },
  { img: "FLY_MENU3", alt: "3-Course Private Dining Menus", cap: "Private Dining Menus" },
];

export default function Fiestas() {
  return (
    <section className="events sec" id="fiestas">
      <div className="wrap">
        <div className="head">
          <div className="scr">lo que se cuece en la casa</div>
          <h2>
            <span className="a">UPCOMING</span>{" "}
            <span className="b">FIESTAS</span>
          </h2>
          <p>
            There&apos;s always a fiesta happening at Casa de Leyva — watch
            parties, Lotería nights, holidays and more. Follow{" "}
            <a
              href="https://www.instagram.com/casadeleyva/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <strong>@casadeleyva</strong>
            </a>{" "}
            so you never miss one.
          </p>
        </div>
        <FiestaGallery variant="gallery" items={HOMEPAGE_FLYERS} />
        <div className="more">
          <a className="btn btn-p" href="/fiestas">
            See All Fiestas
          </a>
        </div>
      </div>
    </section>
  );
}
