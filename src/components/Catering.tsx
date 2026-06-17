const PHONE = "623-306-2386";
const TEL = "tel:6233062386";

export default function Catering() {
  return (
    <>
      <div className="picado5"></div>

      <section className="cat-hero sec">
        <div className="wrap">
          <div className="scr">celebra con nosotros</div>
          <h1 className="pop">
            <span style={{ color: "var(--mag)" }}>CATERING</span>{" "}
            <span style={{ color: "var(--navy)" }}>&amp;</span>{" "}
            <span style={{ color: "var(--teal)" }}>EVENTS</span>
          </h1>
          <div className="tagblk">Now booking in Buckeye</div>
          <p className="lede">
            Bring the authentic flavors of Casa de Leyva to your celebration.
            From family gatherings and office lunches to weddings and
            quinceañeras, every occasion feels like home — with the same
            recipes and warmth you love in our restaurant.
          </p>
          <div className="beat">
            <span className="a">WEDDINGS</span>
            {" · "}
            <span className="b">QUINCEAÑERAS</span>
            {" · "}
            <span className="c">CORPORATE</span>
          </div>
          <div className="ctas">
            <a className="btn btn-p" href={TEL}>
              Call to Plan Your Event
            </a>
            <a className="btn btn-t" href="#taco">
              In-House Taco Catering
            </a>
          </div>
        </div>
      </section>

      <section className="cat-coll sec">
        <div className="wrap">
          <div className="head">
            <div className="scr">para los grandes momentos</div>
            <h2>
              <span className="a">PRIVATE</span> EVENT{" "}
              <span className="b">COLLECTIONS</span>
            </h2>
            <p>
              Three all-inclusive packages for up to 100 guests. Additional
              guests and customizations available.
            </p>
          </div>
          <div className="tiers">
            <div className="tier">
              <div className="cap">
                <div className="name">The Social Collection</div>
                <div className="price">$5,500</div>
                <div className="guests">All-inclusive · 100 guests</div>
              </div>
              <div className="body">
                <div className="tagline">
                  Ideal for intimate celebrations, mixers &amp; birthdays
                </div>
                <ul>
                  <li>
                    <b>4 hours</b> of private facility use
                  </li>
                  <li>
                    Signature appetizer grazing table — mini street tacos, elote
                    cups, taquitos, chips, guacamole &amp; house salsas
                  </li>
                  <li>
                    Unlimited soda, water &amp; two signature aguas frescas
                  </li>
                  <li>
                    <b>Cash bar</b> for margaritas &amp; tap beers
                  </li>
                  <li>
                    House linens, 1 security guard, full setup &amp; cleanup,
                    cake cutting
                  </li>
                </ul>
              </div>
            </div>

            <div className="tier feat">
              <div className="pop-badge">Most Popular</div>
              <div className="cap">
                <div className="name">The Tradición Collection</div>
                <div className="price">$9,200</div>
                <div className="guests">All-inclusive · 100 guests</div>
              </div>
              <div className="body">
                <div className="tagline">
                  Perfect for anniversaries &amp; graduations
                </div>
                <ul>
                  <li>
                    <b>6 hours</b> of private facility use
                  </li>
                  <li>
                    Full Mexican buffet — choice of 2 proteins, rice, beans
                    &amp; tortillas
                  </li>
                  <li>Unlimited soda, water &amp; aguas frescas</li>
                  <li>
                    <b>4-hour hosted beer bar</b> — Pacifico, Michelob Ultra,
                    Dos XX, Coors &amp; Modelo (liquor available for purchase)
                  </li>
                  <li>Event DJ &amp; MC with dance-floor lighting</li>
                  <li>
                    Upgraded linens &amp; runners, 1 security guard, 2 event
                    servers, cake cutting
                  </li>
                </ul>
              </div>
            </div>

            <div className="tier">
              <div className="cap">
                <div className="name">The Leyva Grand Collection</div>
                <div className="price">$14,800</div>
                <div className="guests">All-inclusive · 100 guests</div>
              </div>
              <div className="body">
                <div className="tagline">
                  The ultimate experience for weddings &amp; quinceañeras
                </div>
                <ul>
                  <li>
                    <b>6 hours</b> private venue use <b>+ 2 hours</b> early setup
                    access
                  </li>
                  <li>
                    Dual service — grazing appetizer table <b>plus</b> full
                    buffet or plated dinner
                  </li>
                  <li>
                    <b>Midnight street tacos</b> from the Casa de Leyva food
                    truck
                  </li>
                  <li>Unlimited soda, water &amp; aguas frescas</li>
                  <li>
                    <b>4-hour full hosted open bar</b> — house spirits, signature
                    margaritas &amp; all draft beers
                  </li>
                  <li>
                    Floral centerpieces for every table + sweetheart arrangement
                  </li>
                  <li>Top-tier DJ/MC &amp; custom photo booth</li>
                  <li>Day-of coordinator, 2 security guards, 3 event servers</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cat-cta orange sec">
        <div className="wrap">
          <h2>READY TO CELEBRATE?</h2>
          <p>
            Additional guests and full customizations available — let&apos;s
            build your day.
          </p>
          <a className="btn btn-o" href={TEL}>
            Call {PHONE}
          </a>
        </div>
      </section>

      <section className="cat-taco sec" id="taco">
        <div className="wrap">
          <div className="head">
            <div className="scr">para grupos más pequeños</div>
            <h2>IN-HOUSE TACO CATERING</h2>
            <p>
              Authentic Casa de Leyva for smaller gatherings, in our dedicated
              space.
            </p>
          </div>
          <div className="taco-card">
            <div className="top">
              <div className="pkg">Taco Catering Package</div>
              <div className="price">
                $18 <span>per person</span>
              </div>
              <div className="sub">
                Perfect for groups of 20–40 guests in a private area of our
                restaurant
              </div>
            </div>
            <div className="taco-grid">
              <div className="tbox">
                <h4>Choose Your Proteins</h4>
                <p>
                  <b>Select 2–3:</b> Carne Asada · Pollo Asado · Al Pastor
                </p>
              </div>
              <div className="tbox">
                <h4>What&apos;s Included</h4>
                <p>
                  <b>Sides:</b> Spanish rice &amp; refried beans
                  <br />
                  <b>Tortillas:</b> fresh corn or flour
                  <br />
                  <b>Garnish bar:</b> onion, cilantro, lime, red (hot) &amp;
                  green (mild) salsas
                </p>
              </div>
              <div className="tbox bar">
                <h4>🍺 Bar Service Available</h4>
                <p>
                  <b>Your choice:</b> hosted bar (pre-paid) or cash bar (guests
                  pay). <b>Beer:</b> Pacifico · Michelob Ultra · Dos XX · Coors ·
                  Modelo. All guests must be 21+ with valid ID; no outside
                  beverages permitted per AZ Title 4.
                </p>
              </div>
            </div>
            <div className="taco-note">
              3-hour time slot in our dedicated catering area · $150
              privacy/setup fee · 20% service &amp; production fee added to all
              packages
            </div>
            <div className="taco-cta">
              <a className="btn btn-p" href="/catering/taco">
                Start your booking
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="cat-cta mag sec">
        <div className="wrap">
          <h2>BOOK YOUR CATERING</h2>
          <p>Let us bring Casa de Leyva to your next gathering.</p>
          <a className="btn btn-o" href={TEL}>
            Call {PHONE}
          </a>
        </div>
      </section>
    </>
  );
}
