import FiestaGallery from "@/components/FiestaGallery";
import { getAllFiestas } from "@/lib/fiestas";

export default async function AllFiestas() {
  const items = await getAllFiestas();

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
          <FiestaGallery variant="wall" items={items} />
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
