import RewardsForm from "@/components/RewardsForm";
import { MILESTONES, punchCells, type MilestoneSlug } from "@/lib/rewards";

const PUNCHES = punchCells();
const SLUG_LABEL = Object.fromEntries(
  MILESTONES.map((m) => [m.slug, m.label]),
) as Record<MilestoneSlug, string>;

export default function Rewards() {
  return (
    <>
      <div className="picado5"></div>

      <section className="rw-hero sec">
        <div className="wrap">
          <div className="scr">porque eres de la familia</div>
          <h1 className="pop">
            <span style={{ color: "var(--mag)" }}>CASA</span>{" "}
            <span style={{ color: "var(--teal)" }}>REWARDS</span>
          </h1>
          <div className="tagblk">Free to join</div>
          <p className="lede">
            Our guests are family — and family gets rewarded. Earn free food as
            you go, a treat on your birthday, and first dibs on every fiesta.
          </p>
          <div className="beat">
            <span className="a">EAT</span>
            {" · "}
            <span className="b">EARN</span>
            {" · "}
            <span className="c">FIESTA</span>
          </div>
          <div className="ctas">
            <a className="btn btn-p" href="#join">
              Join Free
            </a>
            <a className="btn btn-t" href="#how">
              How It Works
            </a>
          </div>
        </div>
      </section>

      <section className="rw-card sec">
        <div className="wrap">
          <div className="head">
            <div className="scr">tu tarjeta casa</div>
            <h2>
              <span className="a">EARN</span> AS YOU{" "}
              <span className="b">EAT</span>
            </h2>
          </div>
          <div className="punchcard">
            <div className="punchrow">
              {PUNCHES.map((p) => (
                <div
                  key={p.n}
                  className={
                    "punch" + (p.reward ? ` reward ${p.reward}` : "")
                  }
                >
                  <div className="dot">{p.reward ? "★" : p.n}</div>
                  <div className="lbl">
                    {p.reward ? SLUG_LABEL[p.reward] : ""}
                  </div>
                </div>
              ))}
            </div>
            <div className="signup-note">
              Plus — <b>free chips &amp; queso</b> just for signing up,
              redeemable on your next visit.
            </div>
            <div className="fineprint">
              One punch per visit (max one per day). The card resets after the
              10th visit — then start earning again.
            </div>
          </div>
        </div>
      </section>

      <section className="rw-perks sec">
        <div className="wrap">
          <div className="head">
            <div className="scr">más que comida</div>
            <h2>MEMBER PERKS</h2>
          </div>
          <div className="perkgrid">
            <div className="perk">
              <div className="ic">🧀</div>
              <h3>Welcome Treat</h3>
              <p>Free chips &amp; queso on your next visit after you join.</p>
            </div>
            <div className="perk">
              <div className="ic">🎂</div>
              <h3>Birthday Reward</h3>
              <p>A free appetizer or specialty drink — your choice — during your birthday week.</p>
            </div>
            <div className="perk">
              <div className="ic">🎟️</div>
              <h3>First Dibs</h3>
              <p>Early access to seats for Lotería nights and special fiestas.</p>
            </div>
            <div className="perk">
              <div className="ic">✉️</div>
              <h3>Members-Only</h3>
              <p>Email-only specials and surprises just for the familia.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rw-how sec" id="how">
        <div className="wrap">
          <div className="head">
            <div className="scr">así de fácil</div>
            <h2>HOW IT WORKS</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="n">1</div>
              <h3>Join free</h3>
              <p>Sign up in about 30 seconds — name, email, and your birthday.</p>
            </div>
            <div className="step">
              <div className="n">2</div>
              <h3>Check in each visit</h3>
              <p>
                Give your email or phone at the table and we&apos;ll add your
                visit to your card.
              </p>
            </div>
            <div className="step">
              <div className="n">3</div>
              <h3>Earn &amp; redeem</h3>
              <p>
                Free agua fresca at 3 visits, a dessert at 5, an appetizer at
                10 — then start the card again.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rw-join sec" id="join">
        <div className="wrap">
          <div className="head">
            <div className="scr">únete hoy</div>
            <h2>JOIN CASA REWARDS</h2>
            <p>Free to join, and your first reward starts on your next visit.</p>
          </div>
          <RewardsForm />
        </div>
      </section>
    </>
  );
}
