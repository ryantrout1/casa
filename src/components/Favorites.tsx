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
                <img src="/images/HERO_FAJITA.jpg" alt="" />
              </div>
              <h3>Sizzling Fajitas</h3>
              <p>Steak, chicken or shrimp</p>
            </div>
            <div className="fcard">
              <div className="ph">
                <img src="/images/MOLC.jpg" alt="" />
              </div>
              <h3>The Molcajete</h3>
              <p>Made to share</p>
            </div>
            <div className="fcard">
              <div className="ph">
                <img src="/images/TACOS.jpg" alt="" />
              </div>
              <h3>Street Tacos</h3>
              <p>Fresh off the comal</p>
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
                <img src="/images/BRUNCH.jpg" alt="" />
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
