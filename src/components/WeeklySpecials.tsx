export default function WeeklySpecials() {
  return (
    <section className="week sec" id="specials">
      <div className="wrap">
        <div className="lead">
          <div className="pop">
            <span className="x1">EVERY</span> <span className="x2">DAY</span>{" "}
            <span className="x3">IS A</span> <span className="x4">FIESTA</span>
          </div>
        </div>
        <div className="wgrid">
          <div className="wt">
            <div className="day">Tuesday</div>
            <div className="ttl">Taco Tuesday</div>
            <div className="sm">All-You-Can-Eat Tacos · 4–8 PM</div>
            <div className="price">$19.99</div>
          </div>
          <div className="wt">
            <div className="day">Wednesday</div>
            <div className="ttl">Fajita Wednesday</div>
            <div className="sm">Steak, Chicken or Both!</div>
            <div className="price">$15.99</div>
          </div>
          <div className="wt">
            <div className="day">Tue – Thu</div>
            <div className="ttl">Happy Hour</div>
            <div className="sm">3–5 PM · $5 Margaritas · $3 Draft Beers</div>
          </div>
          <div className="wt">
            <div className="day">Sat &amp; Sun</div>
            <div className="ttl">Weekend Brunch</div>
            <div className="sm">Bloody Marias, mimosas &amp; chilaquiles</div>
          </div>
        </div>
      </div>
    </section>
  );
}
