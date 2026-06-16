export default function Events() {
  return (
    <section className="events sec">
      <div className="wrap">
        <div className="head">
          <div className="scr">lo que se cuece en la casa</div>
          <h2>
            <span className="a">UPCOMING</span> EVENTS &amp;{" "}
            <span className="b">FIESTAS</span>
          </h2>
          <p>
            There&apos;s always something happening at Casa de Leyva. Follow{" "}
            <strong>@casadeleyva</strong> so you never miss a fiesta.
          </p>
        </div>
        <div className="gallery">
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
          <div className="gcard">
            <img src="/images/FLY_FAJITAWED.jpg" alt="Fajita Wednesdays" />
          </div>
        </div>
        <div className="more">
          <a className="btn btn-p" href="#">
            See All Events &amp; Book a Table
          </a>
        </div>
      </div>
    </section>
  );
}
