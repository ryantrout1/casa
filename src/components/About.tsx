export default function About() {
  return (
    <section className="about sec">
      <div className="wrap">
        <div className="grid">
          <div className="pic">
            <img
              src="/images/BUILDING.jpg"
              alt="Rogelio & Stephanie Leyva and the Casa de Leyva team"
            />
          </div>
          <div>
            <div className="scr">siéntete como en casa</div>
            <h2>
              WE&apos;RE A <b>FAMILY</b> — AND YOU&apos;RE INVITED
            </h2>
            <p>
              Rooted in generations of family tradition, Casa de Leyva brings
              the authentic flavors of Mexico to Buckeye. What began as
              home-cooked meals shared with friends has become a gathering place
              where neighbors connect, families celebrate, and every guest
              leaves part of the familia.
            </p>
            <p>
              From zesty salsas to slow-cooked meats, every bite is made with
              love and served with the warmth of home.
            </p>
            <div className="sig">— Rogelio &amp; Stephanie Leyva</div>
            <div className="beat">
              <span className="a">COME FOR THE FOOD</span>
              {" · "}
              <span className="b">STAY FOR THE FAMILIA</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
