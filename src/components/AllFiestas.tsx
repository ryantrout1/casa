import FiestaGallery, { FlyerItem } from "@/components/FiestaGallery";

const FIESTAS: FlyerItem[] = [
  { img: "FLY_MXCZECH", cap: "México vs Czechia · June 24", alt: "México vs Czechia watch party — Wednesday June 24, game at 6PM, $2 draft beer when México scores" },
  { img: "FLY_MXKOREA", cap: "México vs South Korea · June 18", alt: "México vs South Korea watch party — Thursday June 18" },
  { img: "FLY_FIFA", cap: "FIFA Watch Parties", alt: "FIFA is Coming — watch every match with us" },
  { img: "FLY_LOTERIA", cap: "Lotería Night", alt: "Lotería Night" },
  { img: "FLY_TACOTUE", cap: "Taco Tuesdays", alt: "Taco Tuesdays" },
  { img: "FLY_CINCO", cap: "Cinco de Mayo", alt: "Cinco de Mayo" },
  { img: "FLY_FAJITAWED", cap: "Fajita Wednesdays", alt: "Fajita Wednesdays" },
];

export default function AllFiestas() {
  return (
    <>
      <div className="picado5"></div>

      <section className="fz-hero sec">
        <div className="wrap">
          <div className="scr">lo que se cuece en la casa</div>
          <h1 className="pop">
            <span className="a">FIESTAS</span> AT THE{" "}
            <span className="b">CASA</span>
          </h1>
          <div className="tagblk">More added all the time</div>
          <p className="lede">
            There&apos;s always a reason to celebrate at Casa de Leyva — watch
            parties, Lotería nights, holidays and weekly favorites. Here&apos;s
            what&apos;s coming up.
          </p>
        </div>
      </section>

      <section className="fz-gallery sec">
        <div className="wrap">
          <FiestaGallery variant="wall" items={FIESTAS} />
        </div>
      </section>

      <section className="fz-cta sec">
        <div className="wrap">
          <h2>NEVER MISS A FIESTA</h2>
          <p>
            Follow us for the latest, or call to reserve your table for the next
            one.
          </p>
          <div className="ctas">
            <a
              className="btn btn-o"
              href="https://www.instagram.com/casadeleyva/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow @casadeleyva
            </a>
            <a className="btn btn-o" href="tel:6233062386">
              Call 623-306-2386
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
