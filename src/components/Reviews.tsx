const REVIEWS = [
  {
    text: `"Absolutely love this place — great food, amazing margaritas, and awesome service. Ask for the spicy sauce; it's a 10!"`,
    name: "— Cristina L.",
  },
  {
    text: `"We'd been looking for authentic Mexican and found our new spot. Delicious food, attentive staff — we'll be back to this gem in Old Buckeye!"`,
    name: "— Julio A.",
  },
  {
    text: `"Amazing food and service! The owners are so friendly and inviting — Casa de Leyva felt like home, and the molcajete is insane!"`,
    name: "— Steven M.",
  },
  {
    text: `"Hands down the best Mexican food in the West Valley! The owners are amazing and the food is authentic, not Americanized."`,
    name: "— Crystalee O.",
  },
  {
    text: `"A true diamond in the rough in Buckeye — amazing service and even better food. Get the Molcajete; it's the best!"`,
    name: "— J. Ray",
  },
  {
    text: `"Main Street Buckeye is a place out of time, and Casa de Leyva fits right in — authentic, like it's been waiting for you a hundred years."`,
    name: "— Brian R.",
  },
];

export default function Reviews() {
  return (
    <section className="revs sec">
      <div className="wrap">
        <h2>
          WORD ON <span className="a">MONROE STREET</span>
        </h2>
      </div>
      <div className="marquee">
        <div className="track">
          {REVIEWS.map((r, i) => (
            <div className="rev" key={`r-${i}`}>
              <div className="stars">★★★★★</div>
              <p>{r.text}</p>
              <div className="name">{r.name}</div>
            </div>
          ))}
          {REVIEWS.map((r, i) => (
            <div className="rev" aria-hidden={true} key={`rd-${i}`}>
              <div className="stars">★★★★★</div>
              <p>{r.text}</p>
              <div className="name">{r.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
