const FIESTAS = [
  { img: "FLY_FIFA", cap: "FIFA Watch Parties" },
  { img: "FLY_LOTERIA", cap: "Lotería Night" },
  { img: "FLY_TACOTUE", cap: "Taco Tuesdays" },
  { img: "FLY_CINCO", cap: "Cinco de Mayo" },
  { img: "FLY_MENU3", cap: "Private Dining Menus" },
  { img: "FLY_FAJITAWED", cap: "Fajita Wednesdays" },
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
          <div className="fz-grid">
            {FIESTAS.map((f) => (
              <div className="fzcard" key={f.img}>
                <div className="frame">
                  <img src={`/images/${f.img}.jpg`} alt={f.cap} />
                </div>
                <div className="cap">{f.cap}</div>
              </div>
            ))}
          </div>
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
