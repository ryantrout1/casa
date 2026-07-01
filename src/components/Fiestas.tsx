import FiestaGallery from "@/components/FiestaGallery";
import { getGridFiestas } from "@/lib/fiestas";

export default async function Fiestas() {
  const items = await getGridFiestas();

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
        <FiestaGallery variant="gallery" items={items} />
        <div className="more">
          <a className="btn btn-p" href="/fiestas">
            See All Fiestas
          </a>
        </div>
      </div>
    </section>
  );
}
