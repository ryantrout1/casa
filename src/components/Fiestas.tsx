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
        <div className="gallery">
          <div className="gcard">
            <img
              src="/images/FLY_MXKOREA.jpg"
              alt="México vs South Korea watch party — Thursday June 18, $2 beer when Mexico scores"
            />
          </div>
          <div className="gcard">
            <img
              src="/images/FLY_FIFA.jpg"
              alt="FIFA is Coming — watch every match with us"
            />
          </div>
          <div className="gcard">
            <img src="/images/FLY_LOTERIA.jpg" alt="Lotería Night" />
          </div>
          <div className="gcard">
            <img src="/images/FLY_TACOTUE.jpg" alt="Taco Tuesdays" />
          </div>
          <div className="gcard">
            <img src="/images/FLY_CINCO.jpg" alt="Cinco de Mayo" />
          </div>
          <div className="gcard">
            <img
              src="/images/FLY_MENU3.jpg"
              alt="3-Course Private Dining Menus"
            />
          </div>
        </div>
        <div className="more">
          <a className="btn btn-p" href="/fiestas">
            See All Fiestas
          </a>
        </div>
      </div>
    </section>
  );
}
