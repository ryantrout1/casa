export default function Favorites() {
  return (
    <div className="v6src">
      <section className="fav sec">
        <div className="wrap">
          <div className="head">
            <span className="scr">los que todos piden</span>
            <h2 className="slab">CASA FAVORITES</h2>
          </div>
          <div className="favwall">
            <div className="fcard">
              <div className="ph">
                <img src="/images/FAV_BIRRIA.jpg" alt="Birria tacos" />
              </div>
              <h3>Birria Tacos</h3>
              <p>Crispy, cheesy &amp; dipped in consommé</p>
            </div>
            <div className="fcard">
              <div className="ph">
                <img src="/images/FAV_MOLCAJETE.jpg" alt="The Molcajete" />
              </div>
              <h3>The Molcajete</h3>
              <p>Made to share</p>
            </div>
            <div className="fcard">
              <div className="ph">
                <img src="/images/FAV_CORNRIBS.jpg" alt="Corn ribs" />
              </div>
              <h3>Corn Ribs</h3>
              <p>Cotija, chipotle aioli &amp; lime</p>
            </div>
            <div className="fcard">
              <div className="ph">
                <img src="/images/COCKTAIL.jpg" alt="" />
              </div>
              <h3>Cocktails</h3>
              <p>Margaritas &amp; mezcal</p>
            </div>
            <div className="fcard">
              <div className="ph">
                <img src="/images/FAV_BRUNCH.jpg" alt="Weekend brunch" />
              </div>
              <h3>Weekend Brunch</h3>
              <p>Sat &amp; Sun</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
