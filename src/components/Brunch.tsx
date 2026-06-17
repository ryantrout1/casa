type MItem = { name: string; price?: string; desc?: string };

function Item({ name, price, desc }: MItem) {
  return (
    <div className="mitem">
      <div className="top">
        <span className="nm">{name}</span>
        {price ? <span className="pr">{price}</span> : null}
      </div>
      {desc ? <div className="ds">{desc}</div> : null}
    </div>
  );
}

const BREAKFAST: MItem[] = [
  {
    name: "Chilaquiles",
    price: "$15.75",
    desc: "Red or green salsa (divorciados). Fried corn tortilla pieces simmered in salsa, queso fresco, onion, crema, refried beans and two eggs. Add steak +$4 or chicken +$3.",
  },
  {
    name: "Chorizo con Huevos*",
    price: "$15",
    desc: "Two scrambled eggs with chorizo, refried beans and house skillet potatoes.",
  },
  {
    name: "Winnie con Huevos*",
    price: "$10.75",
    desc: "Two scrambled eggs with fried sliced hot dog, refried beans and house skillet potatoes.",
  },
  {
    name: "Tata Chico*",
    price: "$18",
    desc: "Two pancakes, two scrambled eggs with onion, jalapeño and tomato, two bacon strips and house skillet potatoes.",
  },
  {
    name: "Bumper*",
    price: "$15",
    desc: "Two sunny-side-up eggs, refried beans, house skillet potatoes and two strips of bacon.",
  },
  {
    name: "Breakfast Burrito",
    price: "$12.75",
    desc: "Scrambled eggs, refried beans, house potatoes and choice of protein (chorizo, bacon, steak).",
  },
  {
    name: "French Toast Mexicano",
    price: "$14",
    desc: "Thick-cut brioche in house batter infused with Mexican vanilla, sautéed bananas and toasted pecans caramelized in warm piloncillo syrup.",
  },
  {
    name: "French Toast Tres Leches",
    price: "$14",
    desc: "Brioche dipped in tres leches batter, caramel sauce, powdered sugar & strawberries.",
  },
  {
    name: "Cereal",
    price: "$6",
    desc: "Bowl of cereal with cut bananas and strawberries. Frosted Flakes, Lucky Charms or Cinnamon Toast Crunch.",
  },
  {
    name: "Liquados",
    price: "$5.25",
    desc: "Chocolate or strawberry milk and banana smoothie.",
  },
  {
    name: "Café de Olla",
    price: "$5",
    desc: "Traditional Mexican coffee with cinnamon, star anise, chocolate abuelita, sweetened with piloncillo.",
  },
];

export default function Brunch() {
  return (
    <>
      <div className="picado5"></div>

      {/* ---------- HERO ---------- */}
      <section className="mn-hero sec">
        <div className="wrap">
          <div className="scr">buenos días, Buckeye</div>
          <h1 className="pop">
            <span className="a">WEEKEND</span> <span className="b">BRUNCH</span>
          </h1>
          <div className="note">Saturday 10 AM–1 PM · Sunday all day</div>
          <p className="br-hook">
            Bloody Marias, mimosas, chilaquiles and house-made caldos — the
            lazy-weekend spread, Casa style.
          </p>
        </div>
      </section>

      {/* ---------- BRUNCH BAR ---------- */}
      <section className="tt-band tt-purple sec">
        <div className="wrap">
          <div className="head">
            <div className="scr">¡salud!</div>
            <h2>AT THE BRUNCH BAR</h2>
            <p>Weekend sippers to go with your plate.</p>
          </div>
          <div className="br-bar">
            <span className="tt-chip">Bloody Marias</span>
            <span className="tt-chip">Mimosas</span>
            <span className="tt-chip">Café de Olla</span>
            <span className="tt-chip">Liquados</span>
          </div>
        </div>
      </section>

      {/* ---------- CALDOS ---------- */}
      <section className="mn-sec sec">
        <div className="wrap">
          <div className="h">
            <div className="scr">para el alma</div>
            <h2>Caldos</h2>
            <div className="sub">Saturday &amp; Sunday · all day</div>
          </div>
          <div className="mn-grid">
            <Item
              name="Menudo"
              price="$13 / $15"
              desc="White and red menudo with toasted bolillo or corn tortillas. Small $13 · Large $15."
            />
            <Item
              name="Pozole"
              price="$13 / $15"
              desc="Comes with corn tortillas. Small $13 · Large $15."
            />
          </div>
        </div>
      </section>

      {/* ---------- BREAKFAST & BRUNCH ---------- */}
      <section className="mn-sec sec">
        <div className="wrap">
          <div className="h">
            <div className="scr">lo más rico</div>
            <h2>Breakfast &amp; Brunch</h2>
            <div className="sub">Saturday 10 AM–1 PM · Sunday all day</div>
          </div>
          <div className="mn-grid">
            {BREAKFAST.map((i) => (
              <Item key={i.name} {...i} />
            ))}
          </div>
          <div className="mn-block">
            <h3>D.I.Y.</h3>
            <div className="mn-extras">
              <span className="x">
                <b>2 Pancakes</b> $5
              </span>
              <span className="x">
                <b>House Potatoes</b> $4
              </span>
              <span className="x">
                <b>2 Eggs</b> $5
              </span>
              <span className="x">
                <b>3 Bacon</b> $5
              </span>
            </div>
          </div>
          <div className="mn-advisory">
            * Consuming raw or undercooked meats, poultry, seafood, shellfish or
            eggs may increase your risk of foodborne illness, especially if you
            have certain medical conditions.
          </div>
        </div>
      </section>

      {/* ---------- CLOSING ---------- */}
      <section className="tt-close br-purp sec">
        <div className="wrap">
          <h2>SEE YOU THIS WEEKEND</h2>
          <p>
            424 E Monroe Ave, Buckeye · Brunch served Saturday 10 AM–1 PM and
            all day Sunday.
          </p>
          <div className="ctas">
            <a className="btn btn-o" href="/#find">
              Find Us
            </a>
            <a className="btn btn-ghost" href="tel:6233062386">
              Call 623-306-2386
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
