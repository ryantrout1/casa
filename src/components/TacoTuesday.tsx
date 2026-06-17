const PHONE = "623-306-2386";
const TEL = "tel:6233062386";

export default function TacoTuesday() {
  return (
    <>
      <div className="picado5"></div>

      {/* ---------- HERO ---------- */}
      <section className="tt-hero sec">
        <div className="wrap">
          <div className="scr">¡el mejor día de la semana!</div>
          <h1>
            <span className="w1">TACO</span>{" "}
            <span className="w2">TUESDAYS</span>
          </h1>
          <div className="tagblk">The best day of the week</div>
          <p className="lede">
            All-you-can-eat tacos, build-your-own and your way — every single
            Tuesday at Casa de Leyva. Great food, cold drinks, good vibes.
          </p>

          <div className="tt-ticket">
            <div className="amt-blk">
              <div className="lab">ALL YOU CAN EAT</div>
              <div className="amt">
                <sup>$</sup>19<sup>.99</sup>
              </div>
            </div>
            <div className="div"></div>
            <div className="when">
              <div className="k">SERVED</div>
              <div className="v">4 – 8 PM</div>
              <div className="d">Dine-in only · every Tuesday</div>
            </div>
          </div>

          <div className="ctas">
            <a className="btn btn-p" href="/menu">
              See the Menu
            </a>
            <a className="btn btn-t" href={TEL}>
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* ---------- BUILD YOUR OWN ---------- */}
      <section className="tt-band tt-teal sec">
        <div className="wrap">
          <div className="head">
            <div className="scr">hazlo a tu manera</div>
            <h2>BUILD YOUR OWN. YOUR WAY.</h2>
            <p>
              Order round after round and stack them however you like — three
              simple steps to taco heaven.
            </p>
          </div>
          <div className="tt-steps">
            <div className="tt-step">
              <span className="n">1</span>
              <h3>PICK YOUR PROTEIN</h3>
              <p>
                Carne Asada · Pollo Asado · Al Pastor — order as many rounds as
                you can handle.
              </p>
            </div>
            <div className="tt-step">
              <span className="n">2</span>
              <h3>HIT THE SALSA BAR</h3>
              <p>
                Onion, cilantro, lime, and our house red &amp; green salsas to
                dress every taco.
              </p>
            </div>
            <div className="tt-step">
              <span className="n">3</span>
              <h3>REPEAT TIL FULL</h3>
              <p>
                Unlimited tacos, endless good times. We keep them coming until 8
                PM.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- DRINK DEALS ---------- */}
      <section className="tt-band tt-orange sec">
        <div className="wrap">
          <div className="head">
            <div className="scr">¡salud!</div>
            <h2>WASH IT DOWN</h2>
            <p>Tuesday pricing on the drinks that make taco night a fiesta.</p>
          </div>
          <div className="tt-duo">
            <div className="tt-deal m">
              <div className="big">$5</div>
              <h3>MARGARITAS</h3>
            </div>
            <div className="tt-deal o">
              <div className="big">$3</div>
              <h3>DRAFT BEERS</h3>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- SALSA BAR ---------- */}
      <section className="tt-band tt-yellow sec">
        <div className="wrap">
          <div className="tt-salsa">
            <div className="copy">
              <div className="scr">construye tu taco perfecto</div>
              <h2>
                <span style={{ color: "var(--mag)" }}>SALSA</span>{" "}
                <span style={{ color: "var(--purp)" }}>BAR</span>
              </h2>
              <p>
                Build your perfect taco. Pile on the toppings and pick your heat
                — from mild green to bring-the-fire red.
              </p>
              <div className="tt-chips">
                <span className="tt-chip">Diced Onion</span>
                <span className="tt-chip">Fresh Cilantro</span>
                <span className="tt-chip">Lime Wedges</span>
                <span className="tt-chip">Salsa Roja · Hot</span>
                <span className="tt-chip">Salsa Verde · Mild</span>
              </div>
            </div>
            <div className="tt-pots" aria-hidden="true">
              <span className="tt-pot" style={{ background: "#3f7d3a" }}></span>
              <span className="tt-pot" style={{ background: "#c0392b" }}></span>
              <span className="tt-pot" style={{ background: "#e0e0d4" }}></span>
              <span className="tt-pot" style={{ background: "#7aa84f" }}></span>
              <span className="tt-pot" style={{ background: "#a93226" }}></span>
              <span className="tt-pot" style={{ background: "#5f9347" }}></span>
              <span className="tt-pot" style={{ background: "#d35400" }}></span>
              <span className="tt-pot" style={{ background: "#2e6b2a" }}></span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- RULES ---------- */}
      <section className="tt-rules sec">
        <div className="wrap">
          <div className="beat">
            <span className="a">GREAT FOOD.</span>{" "}
            <span className="b">COLD DRINKS.</span>{" "}
            <span className="c">GOOD VIBES.</span>{" "}
            <span className="d">EVERY TUESDAY.</span>
          </div>
          <div className="tt-fine">
            <span>Dine-in only</span>
            <span>No sharing</span>
            <span>No to-go boxes</span>
            <span>Served 4–8 PM</span>
          </div>
        </div>
      </section>

      {/* ---------- CLOSING CTA ---------- */}
      <section className="tt-close sec">
        <div className="wrap">
          <h2>SEE YOU TUESDAY</h2>
          <p>
            424 E Monroe Ave, Buckeye · All-you-can-eat tacos every Tuesday,
            4–8 PM.
          </p>
          <div className="ctas">
            <a className="btn btn-o" href="/#find">
              Find Us
            </a>
            <a className="btn btn-ghost" href={TEL}>
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
