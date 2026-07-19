import { SPECIALS, phoenixWeekday, specialForDay } from "@/lib/specials";

export default function WeeklySpecials() {
  const today = specialForDay(phoenixWeekday(new Date()));
  const rail = SPECIALS.filter((s) => s.id !== today?.id);

  return (
    <section className="week sec" id="specials">
      <div className="wrap">
        <div className="lead">
          <div className="pop">
            <span className="x1">EVERY</span> <span className="x2">DAY</span>{" "}
            <span className="x3">IS A</span> <span className="x4">FIESTA</span>
          </div>
        </div>

        {today ? (
          today.photo ? (
            <div className={`featured has-photo ${today.accent}`}>
              <img className="ph-img" src={today.photo} alt={today.title} />
              <div className="ph-scrim" aria-hidden="true"></div>
              {today.price && <div className="burst">{today.price}</div>}
              <div className="ft-copy">
                <span className="badge">Today · {today.day}</span>
                <h3>{today.title}</h3>
                <div className="blurb">{today.blurb}</div>
              </div>
            </div>
          ) : (
            <div className={`featured ${today.accent}`}>
              <div className="ft-copy">
                <span className="badge">Today · {today.day}</span>
                <h3>{today.title}</h3>
                <div className="blurb">{today.blurb}</div>
              </div>
              {today.price && <div className="price">{today.price}</div>}
            </div>
          )
        ) : (
          <div className="featured closed">
            <div className="ft-copy">
              <span className="badge">Cerrado · Monday</span>
              <h3>Closed Mondays</h3>
              <div className="blurb">
                See you Tuesday at 4 PM for Taco Tuesday!
              </div>
            </div>
          </div>
        )}

        <div className="rail">
          {rail.map((s) =>
            s.photo ? (
              <div key={s.id} className={`rail-item has-photo ${s.accent}`}>
                <img className="ph-img" src={s.photo} alt={s.title} />
                <div className="ph-scrim" aria-hidden="true"></div>
                <div className="ri-copy">
                  <div className="day">{s.day}</div>
                  <div className="ttl">{s.title}</div>
                  {s.price ? (
                    <div className="price">{s.price}</div>
                  ) : (
                    <div className="price sm-price">Fan favorite</div>
                  )}
                </div>
              </div>
            ) : (
              <div key={s.id} className={`rail-item ${s.accent}`}>
                <div className="day">{s.day}</div>
                <div className="ttl">{s.title}</div>
                {s.price ? (
                  <div className="price">{s.price}</div>
                ) : (
                  <div className="price sm-price">Fan favorite</div>
                )}
              </div>
            ),
          )}
        </div>

        <div className="also">
          <b>Happy Hour</b> Tue&ndash;Thu 3&ndash;5 PM &middot;{" "}
          <b>Weekend Brunch</b> Sat &amp; Sun &middot;{" "}
          <b>Micheladas Preparadas</b>
        </div>
      </div>
    </section>
  );
}
