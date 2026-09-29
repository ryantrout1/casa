import type { CSSProperties } from "react";
import { phoenixWeekday } from "@/lib/specials";
import { buildSpecialsView, toneStyle } from "@/lib/specialsView";

// "Every Day Is A Fiesta". Everything this section decides lives in
// specialsView.ts (pure, tested); this component only renders it. The
// decorative layers (garland, steam, sweep, bubbles) are aria-hidden and all
// motion is CSS, switched off under prefers-reduced-motion in globals.css.

const FLAGS = Array.from({ length: 16 }, (_, i) => i);
const STEAM = Array.from({ length: 5 }, (_, i) => i);
const BUBBLES = Array.from({ length: 8 }, (_, i) => i);

const indexVar = (i: number) => ({ "--i": i }) as CSSProperties;

function Garland() {
  return (
    <div className="wk-garland" aria-hidden="true">
      {FLAGS.map((i) => (
        <span key={i} className="wk-flag" style={indexVar(i)} />
      ))}
    </div>
  );
}

export default function WeeklySpecials() {
  const { featured: f, rail } = buildSpecialsView(phoenixWeekday(new Date()));

  return (
    <section className="week sec" id="specials">
      <div className="wrap">
        <div className="lead">
          <div className="pop">
            <span className="x1">EVERY</span> <span className="x2">DAY</span>{" "}
            <span className="x3">IS A</span> <span className="x4">FIESTA</span>
          </div>
        </div>

        {f ? (
          <article
            className={`wk-card t-${f.titleSize}${f.pair ? " has-pair" : ""}`}
            style={toneStyle(f.tone) as CSSProperties}
          >
            <Garland />
            <div className="wk-sweep" aria-hidden="true" />

            <div className="wk-copy">
              <div className="wk-when">
                <span className="wk-day">{f.day}</span>
                <span className="wk-today">Today</span>
              </div>
              <h3 className="wk-title">{f.title}</h3>
              <p className="wk-blurb">{f.blurb}</p>
              {f.includes.length > 0 && (
                <ul className="wk-chips" aria-label="Includes">
                  {f.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              <a className="wk-cta" href={f.cta.href}>
                {f.cta.label}
              </a>
            </div>

            <div className="wk-plate-wrap">
              <div className="wk-ring" aria-hidden="true" />
              {f.photo && <img className="wk-plate" src={f.photo} alt={f.title} />}
              <div className="wk-steam" aria-hidden="true">
                {STEAM.map((i) => (
                  <span key={i} style={indexVar(i)} />
                ))}
              </div>
              <div className={`wk-star${f.priceLabel.length > 7 ? " is-long" : ""}`}>
                <span>{f.priceLabel}</span>
              </div>
            </div>

            {f.pair && (
              <figure className="wk-pair">
                <div className="wk-pair-photo">
                  <img src={f.pair.photo} alt={f.pair.alt} />
                  <div className="wk-bubbles" aria-hidden="true">
                    {BUBBLES.map((i) => (
                      <span key={i} style={indexVar(i)} />
                    ))}
                  </div>
                </div>
                <figcaption>
                  <span className="wk-pair-kicker">Pair it</span>
                  <span className="wk-pair-text">{f.pair.text}</span>
                </figcaption>
              </figure>
            )}
          </article>
        ) : (
          <article className="wk-card">
            <Garland />
            <div className="wk-copy">
              <div className="wk-when">
                <span className="wk-day">Cerrado</span>
                <span className="wk-today">Monday</span>
              </div>
              <h3 className="wk-title">Closed Mondays</h3>
              <p className="wk-blurb">See you Tuesday at 4 PM for Taco Tuesday!</p>
            </div>
          </article>
        )}

        <ul className="wk-rail">
          {rail.map((r) => (
            <li key={r.id} className="wk-tile" style={toneStyle(r.tone) as CSSProperties}>
              {r.photo && <img src={r.photo} alt={r.title} />}
              <div className="wk-tile-copy">
                <span className="wk-tile-day">{r.day}</span>
                <span className="wk-tile-title">{r.title}</span>
                <span className="wk-tile-price">{r.priceLabel}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="also">
          <b>Happy Hour</b> Tue&ndash;Thu 3&ndash;5 PM &middot;{" "}
          <b>Weekend Brunch</b> Sat &amp; Sun &middot;{" "}
          <b>Micheladas Preparadas</b>
        </div>
      </div>
    </section>
  );
}
