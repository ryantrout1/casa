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

const APPETIZERS: MItem[] = [
  { name: "Tuétano", price: "$18", desc: "Grilled bone marrow served with corn tortillas." },
  { name: "Corn Ribs", price: "$14", desc: "Fried corn topped with cotija cheese, cilantro, and mayo-chipotle sauce." },
  { name: "Hit or Miss Toritos", price: "$15.75", desc: "Yellow peppers wrapped in bacon, stuffed with cream cheese and shrimp." },
  { name: "Empanaditas", price: "$14.35", desc: "Fried empanadas stuffed with cheese and poblano peppers, drizzled with chipotle aioli and guacasalsa." },
  { name: "Guacamole or Queso Dip", price: "$12", desc: "Bowl of fresh homemade guacamole or white queso dip with house chips. Both Guac & Queso $19." },
  { name: "Nacho Supreme", price: "$17", desc: "Fried corn tortilla chips topped with cheddar nacho cheese, onion, cilantro, sour cream drizzle and a scoop of guacamole. Meat choice: carne asada, chicken or al pastor." },
];

const TACOS: MItem[] = [
  { name: "Carne Asada", price: "$11.75", desc: "Carne asada, corn tortilla, onion & cilantro." },
  { name: "Al Pastor", price: "$11.75", desc: "Marinated pork topped with pineapple, corn tortilla, onion & cilantro." },
  { name: "Pollo", price: "$10.75", desc: "Seasoned grilled chicken, corn tortilla, onion & cilantro." },
  { name: "Trifecta", price: "$10.75", desc: "Carne asada, chicken & al pastor on corn tortilla, onion & cilantro." },
  { name: "Gobernador*", price: "$13.25", desc: "Shrimp, melted cheese & sautéed veggies with crispy tortilla shell." },
  { name: "Pescado*", price: "$13.25", desc: "Beer-battered tilapia, cabbage, pico and aioli sauce on corn tortilla." },
  { name: "Quesa Birria", price: "$13.25", desc: "Slow-cooked shredded beef, melted cheese, onion & cilantro with crispy tortilla shell." },
];

const ENTREES: MItem[] = [
  { name: "Enchiladas", price: "$19.99", desc: "Red, green or mole sauce. Corn tortillas, shredded chicken, sour cream, shredded lettuce, onion & queso fresco, side of rice & beans." },
  { name: "Chicken Mole", price: "$19.99", desc: "Authentic mole sauce over shredded chicken, sesame seeds, side of rice & beans." },
  { name: "Chile Relleno", price: "$19.99", desc: "Two poblano peppers stuffed with asadero cheese, battered and fried, side salsa, rice & beans." },
  { name: "Carne con Chile Colorado", price: "$21.99", desc: "Braised beef cubes in red chili sauce, side of rice and beans." },
  { name: "Fajitas", price: "$24.99", desc: "Grilled steak, chicken or shrimp with sautéed peppers and onions, rice & beans, side of guac and sour cream." },
  { name: "Rami's Costillas en Salsa Verde", price: "$21.99", desc: "Chef's favorite — pork spare ribs slow-cooked in green salsa, rice & beans." },
  { name: "Huarache", price: "$16", desc: "Fried masa topped with refried beans, shredded lettuce, onion, queso fresco & choice of protein (shredded beef or chicken)." },
  { name: "Sopes", price: "$18.55", desc: "Two fried masa topped with beans, lettuce, onion, tomato and queso fresco, side of rice. Shredded beef, shredded chicken, carne asada or al pastor." },
  { name: "Camarones Rancheros", price: "$22.99", desc: "Sautéed shrimp smothered in jalapeño peppers, onions, tomatoes and green bell peppers, topped with cilantro." },
  { name: "Molcajete", price: "$47.98", desc: "Customer favorite — carne asada, pollo asado, gulf shrimp, nopal, green onions, queso fresco, salsa, rice and whole beans, topped with avocado, in lava rock." },
];

const PARRILLADA: MItem[] = [
  { name: "El Jefe", price: "$36.99", desc: "Grilled skirt steak, flanken short beef ribs, tuétano asado, mini quesadillas, grilled onions, macaroni salad, side of rice and beans." },
  { name: "Cielo Mar y Tierra", price: "$35.98", desc: "Carne asada, pollo asado & shrimp skewer, mini quesadilla, grilled green onions, macaroni salad, rice, beans with choice of tortillas." },
  { name: "Carne Asada", price: "$23.98", desc: "Grilled skirt steak with grilled onions, rice, beans, mini quesadillas and macaroni salad." },
  { name: "Costillitas de Res", price: "$23.98", desc: "Four flanken short beef ribs, two mini quesadillas, grilled green onions, rice, beans and macaroni salad." },
  { name: "Chuleta de Puerco", price: "$23.98", desc: "Grilled pork chop marinated in adobo, two mini quesadillas, grilled green onions, rice, beans and macaroni salad." },
];

const BREAKFAST: MItem[] = [
  { name: "Chilaquiles", price: "$15.75", desc: "Red or green salsa (divorciados). Fried corn tortilla pieces simmered in salsa, queso fresco, onion, crema, refried beans and two eggs. Add steak +$4 or chicken +$3." },
  { name: "Chorizo con Huevos*", price: "$15", desc: "Two scrambled eggs with chorizo, refried beans and house skillet potatoes." },
  { name: "Winnie con Huevos*", price: "$10.75", desc: "Two scrambled eggs with fried sliced hot dog, refried beans and house skillet potatoes." },
  { name: "Tata Chico*", price: "$18", desc: "Two pancakes, two scrambled eggs with onion, jalapeño and tomato, two bacon strips and house skillet potatoes." },
  { name: "Bumper*", price: "$15", desc: "Two sunny-side-up eggs, refried beans, house skillet potatoes and two strips of bacon." },
  { name: "Breakfast Burrito", price: "$12.75", desc: "Scrambled eggs, refried beans, house potatoes and choice of protein (chorizo, bacon, steak)." },
  { name: "French Toast Mexicano", price: "$14", desc: "Thick-cut brioche in house batter infused with Mexican vanilla, sautéed bananas and toasted pecans caramelized in warm piloncillo syrup." },
  { name: "French Toast Tres Leches", price: "$14", desc: "Brioche dipped in tres leches batter, caramel sauce, powdered sugar & strawberries." },
  { name: "Cereal", price: "$6", desc: "Bowl of cereal with cut bananas and strawberries. Frosted Flakes, Lucky Charms or Cinnamon Toast Crunch." },
  { name: "Liquados", price: "$5.25", desc: "Chocolate or strawberry milk and banana smoothie." },
  { name: "Café de Olla", price: "$5", desc: "Traditional Mexican coffee with cinnamon, star anise, chocolate abuelita, sweetened with piloncillo." },
];

const COCKTAILS: MItem[] = [
  { name: "Tia Mia", price: "$14", desc: "Jamaican rum, dry curaçao, orgeat, fresh lime juice." },
  { name: "Saladito", price: "$14", desc: "Ancho liquor, honey syrup, fresh lime juice, smoked salt." },
  { name: "Mezcal Rose", price: "$14", desc: "Aperol, pineapple juice & fresh lime juice." },
  { name: "Paloma", price: "$14", desc: "Tequila, orange juice, grapefruit juice, lime juice and fresca." },
  { name: "Negra Paloma", price: "$14", desc: "Ancho chili liquor, grapefruit juice, fresca, scratched with smoked salt." },
  { name: "Getaway Car", price: "$14", desc: "Rum, tequila, ancho chili liquor, pineapple juice, lime juice, simple syrup." },
  { name: "La Gaviota", price: "$14", desc: "Aperol, lime juice, mango purée, scratched with sal de gusano." },
  { name: "Piña Pa'la Niña", price: "$14", desc: "Piña mezcal, pineapple juice, cinnamon syrup, bitters, lime juice." },
  { name: "Ginger Peach Mule", price: "$14", desc: "Gran Centenario Reposado, peach purée, lime juice, ginger beer." },
  { name: "Guava Cosmo", price: "$14", desc: "Vodka, orange liqueur, guava syrup, lime juice." },
  { name: "A la Antigua", price: "$16", desc: "Partida Roble Fino Añejo, bitters, agave syrup, orange zest & amarena cherry." },
  { name: "Como la Flor", price: "$14", desc: "Four Roses Bourbon, Aperol, strawberry, soda, orange slices." },
  { name: "Coronaritas", price: "$11", desc: "Margarita with an overturned bottle of Coronita." },
  { name: "Margaritas", price: "$8", desc: "Lime, strawberry, mango, jamaica, guava or prickly pear. Salt, Tajín or sugar rimmed. Blended or on the rocks." },
];

const DESSERTS: MItem[] = [
  { name: "Churro Cheesecake", price: "$9", desc: "Cinnamon sugar cheesecake topped with chopped strawberries and chocolate drizzle." },
  { name: "Flan", price: "$10", desc: "Baked custard with runny caramel topping." },
  { name: "Tres Leches", price: "$10", desc: "Light, fluffy sponge cake soaked in a blend of three milks, topped with whipped cream." },
];

const NAV = [
  ["Appetizers", "#appetizers"],
  ["Lunch", "#lunch"],
  ["Tacos", "#tacos"],
  ["Kids", "#kids"],
  ["Entrées", "#entrees"],
  ["Breakfast", "#breakfast"],
  ["Drinks", "#drinks"],
  ["Desserts", "#desserts"],
];

export default function Menu() {
  return (
    <>
      <div className="picado5"></div>

      <section className="mn-hero sec">
        <div className="wrap">
          <div className="scr">buen provecho</div>
          <h1 className="pop">
            <span className="a">OUR</span> <span className="b">MENU</span>
          </h1>
          <div className="note">Chips &amp; salsa are complimentary</div>
        </div>
      </section>

      <div className="mn-nav">
        <div className="wrap">
          <div className="row">
            {NAV.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* APPETIZERS */}
      <section className="mn-sec" id="appetizers">
        <div className="wrap">
          <div className="h">
            <h2>Appetizers</h2>
          </div>
          <div className="mn-grid">
            {APPETIZERS.map((i) => (
              <Item key={i.name} {...i} />
            ))}
          </div>
        </div>
      </section>

      {/* LUNCH SPECIALS */}
      <section className="mn-sec" id="lunch">
        <div className="wrap">
          <div className="h">
            <h2>Lunch Specials</h2>
            <div className="sub">11 AM – 2 PM · Tue–Sat</div>
          </div>
          <div className="mn-grid">
            <Item
              name="Tour of Mexico"
              price="$15.25"
              desc="One chicken enchilada, one beef taco dorado, one potato rolled taquito, side of rice and beans."
            />
            <Item
              name="Taco Plate"
              price="$12.95"
              desc="Two soft-shell corn tortilla tacos, onion and cilantro, side of rice and beans. Carne asada, chicken or al pastor."
            />
          </div>
          <div className="mn-block">
            <h3>Combo Lunches</h3>
            <div className="lead">
              Choose any 1 or 2 of your favorites — all served with rice and
              beans.
            </div>
            <p>
              Beef Tostada · Chicken Tostada · Taco Dorado (shredded beef,
              chicken or potato) · Rolled Taquito (shredded beef, chicken or
              potato) · Chicken Enchilada · Beef Enchilada · Chicken Burrito +$1
              · Carne Asada Burrito +$1.95
            </p>
            <div className="prices">
              <span className="pill">Combo · 1 item $12.95</span>
              <span className="pill b">Combo · 2 items $14.35</span>
            </div>
            <div className="mn-extras">
              <span className="x">
                <b>Extras —</b> Guacamole 4oz $5.75
              </span>
              <span className="x">Sour Cream 4oz $3.25</span>
              <span className="x">Cheese 4oz $3.25</span>
            </div>
          </div>
        </div>
      </section>

      {/* TACOS */}
      <section className="mn-sec" id="tacos">
        <div className="wrap">
          <div className="h">
            <div className="scr">it&apos;s taco time</div>
            <h2>Tacos</h2>
            <div className="sub">
              Soft shell · 3 per order · Add a side of rice &amp; beans $5
            </div>
          </div>
          <div className="mn-grid">
            {TACOS.map((i) => (
              <Item key={i.name} {...i} />
            ))}
          </div>

          <div className="mn-subh">
            Tacos Dorados &amp; Rolled Taquitos
            <span className="note">Hard shell · 4 per order</span>
          </div>
          <div className="mn-grid">
            <Item
              name="Potato, Shredded Chicken or Beef"
              price="$14"
              desc="Topped with shredded lettuce, cotija cheese, purple onion & crema. Make them ahogados +$2."
            />
          </div>

          <div className="mn-subh">Burritos</div>
          <div className="mn-grid">
            <Item
              name="Burrito"
              price="$13.75"
              desc="Rice, beans, onion and cilantro in a flour tortilla. Carne asada, chicken, al pastor, red chili beef, shredded beef or chile relleno +$2. Make it a wet burrito (green or red sauce) +$2."
            />
            <Item
              name="Quesa Supreme"
              price="$15"
              desc="Flour tortilla, mozzarella cheese, onion, cilantro, sour cream drizzle inside. Asada, chicken or al pastor."
            />
          </div>
        </div>
      </section>

      {/* KIDS */}
      <section className="mn-sec" id="kids">
        <div className="wrap">
          <div className="h">
            <h2>Kids Menu</h2>
            <div className="sub">$9.99 · drink included</div>
          </div>
          <div className="mn-grid">
            <Item
              name="Taco Plate"
              desc="Soft-shell taco with rice & beans, onion & cilantro on the side. Beef, chicken or pork."
            />
            <Item
              name="Mini Quesadilla"
              desc="Flour tortilla with melted cheese, side of beans and rice. Add beef or chicken +$3."
            />
            <Item
              name="Bean & Cheese Tostada"
              desc="Topped with mozzarella cheese, side of rice. Add shredded beef or chicken +$3."
            />
          </div>
        </div>
      </section>

      {/* ENTREES */}
      <section className="mn-sec" id="entrees">
        <div className="wrap">
          <div className="h">
            <h2>Plato Fuerte · Entrées</h2>
          </div>
          <div className="mn-grid">
            {ENTREES.map((i) => (
              <Item key={i.name} {...i} />
            ))}
          </div>

          <div className="mn-subh">
            ¿Se va hacer o no se va hacer, la carnita asada?
            <span className="note">From the grill</span>
          </div>
          <div className="mn-grid">
            {PARRILLADA.map((i) => (
              <Item key={i.name} {...i} />
            ))}
          </div>
        </div>
      </section>

      {/* BREAKFAST + CALDOS */}
      <section className="mn-sec" id="breakfast">
        <div className="wrap">
          <div className="h">
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

          <div className="mn-subh">
            Breakfast &amp; Brunch
            <span className="note">Saturday 10 AM–1 PM · Sunday all day</span>
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
        </div>
      </section>

      {/* DRINKS / BEER / COCKTAILS */}
      <section className="mn-sec" id="drinks">
        <div className="wrap">
          <div className="h">
            <h2>Drinks</h2>
          </div>
          <div className="mn-grid">
            <Item name="Agua Frescas" price="$7" desc="Horchata, Jamaica." />
            <Item name="Iced Tea" price="$4" desc="Unsweetened." />
            <Item
              name="Soda / Fountain"
              price="$4"
              desc="Coca-Cola, Diet Coke, Coke Zero, Minute Maid, Root Beer, Orange Fanta, Dr Pepper, Fresca."
            />
          </div>

          <div className="mn-subh">Beer</div>
          <div className="beer-cols">
            <div className="beer-col">
              <h4>
                Domestic <span>$4.50</span>
              </h4>
              <ul>
                <li>Michelob Ultra</li>
                <li>Coors Banquet</li>
                <li>Coors Light</li>
                <li>Miller Light</li>
              </ul>
            </div>
            <div className="beer-col">
              <h4>
                Import <span>$5.50</span>
              </h4>
              <ul>
                <li>Corona</li>
                <li>Modelo Especial</li>
                <li>Modelo Negra</li>
                <li>Pacifico</li>
                <li>Dos XX</li>
                <li>Tecate Light</li>
              </ul>
            </div>
            <div className="beer-col">
              <h4>Draft</h4>
              <ul>
                <li>
                  Coors Light <span className="p">$5.50</span>
                </li>
                <li>
                  Michelob Ultra <span className="p">$5.50</span>
                </li>
                <li>
                  Pacifico <span className="p">$6.50</span>
                </li>
                <li>
                  Modelo <span className="p">$6.50</span>
                </li>
                <li>
                  Dos XX <span className="p">$6.50</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="beer-note">
            Michelada +$3 — choice of beer and house michelada mix.
          </div>

          <div className="mn-subh">
            Signature Cocktails
            <span className="note">Una más y nos vamos · tequila or mezcal</span>
          </div>
          <div className="mn-grid">
            {COCKTAILS.map((i) => (
              <Item key={i.name} {...i} />
            ))}
          </div>
        </div>
      </section>

      {/* DESSERTS */}
      <section className="mn-sec" id="desserts">
        <div className="wrap">
          <div className="h">
            <div className="scr">para el final feliz</div>
            <h2>Desserts</h2>
          </div>
          <div className="mn-grid">
            {DESSERTS.map((i) => (
              <Item key={i.name} {...i} />
            ))}
          </div>
          <div className="mn-advisory">
            * Consuming raw or undercooked meats, poultry, seafood, shellfish or
            eggs may increase your risk of foodborne illness, especially if you
            have certain medical conditions.
          </div>
        </div>
      </section>

      <section className="mn-closing sec">
        <div className="wrap">
          <h2>¿Listos para comer?</h2>
          <p>Walk in, or call ahead — we&apos;ll have a table waiting.</p>
          <div className="ctas">
            <a className="btn btn-o" href="tel:6233062386">
              Call 623-306-2386
            </a>
            <a className="btn btn-o" href="/#find">
              Find Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
