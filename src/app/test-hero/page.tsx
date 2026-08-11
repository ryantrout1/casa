import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getHeroFiesta } from "@/lib/fiestas";

// Throwaway comparison page for the "fiesta takeover" hero concept. Renders the
// current hero fiesta three different ways so the treatments can be judged
// against the real flyer rather than a mockup. Not linked from anywhere and
// explicitly noindex — delete the route when a direction is picked.
export const metadata: Metadata = {
  title: "Hero takeover — treatment comparison",
  robots: { index: false, follow: false },
};

export const revalidate = 300;

// Scoped to .th-demo so nothing here can leak into globals.css. Brand tokens
// (--yel, --mag, --teal, --cream) are inherited from the .v8 wrapper.
const css = `
.th-demo .th-label{background:var(--navy);color:var(--cream);padding:10px 28px;font-family:'Fredoka',sans-serif;font-size:13px;letter-spacing:.06em;display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}
.th-demo .th-label b{font-family:'Bangers',cursive;font-size:20px;letter-spacing:.04em;color:var(--yel);font-weight:400}
.th-demo .th-label span{opacity:.72}

.th-demo .th-stage{position:relative;overflow:hidden;background:#140c06}
.th-demo .th-eyebrow{font-family:'Fredoka',sans-serif;font-weight:600;font-size:13px;letter-spacing:.24em;color:var(--yel);margin-bottom:10px}
.th-demo .th-h1{font-family:'Bangers',cursive;font-weight:400;line-height:.92;font-size:clamp(40px,6.4vw,80px);color:#f7ecd4;letter-spacing:.02em}
.th-demo .th-h1 em{font-style:normal;color:var(--mag)}
.th-demo .th-scr{font-family:'Pacifico',cursive;font-size:clamp(26px,3.6vw,44px);color:var(--mag);line-height:1.12;margin-top:-4px}
.th-demo .th-ribbon{display:inline-block;background:var(--teal);color:#04342c;font-family:'Fredoka',sans-serif;font-weight:600;font-size:13px;letter-spacing:.16em;padding:7px 20px;margin-top:14px}
.th-demo .th-sub{font-family:'Mulish',sans-serif;color:#cbbca0;font-size:16px;margin-top:14px;line-height:1.6}
.th-demo .th-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}
.th-demo .th-btn{display:inline-block;font-family:'Fredoka',sans-serif;font-weight:600;font-size:16px;padding:13px 28px;border-radius:999px;border:3px solid transparent;transition:.2s}
.th-demo .th-btn-y{background:var(--yel);color:#3a2a00}
.th-demo .th-btn-y:hover{background:#f0b400}
.th-demo .th-btn-g{border-color:rgba(247,236,212,.42);color:#f7ecd4}
.th-demo .th-btn-g:hover{background:rgba(247,236,212,.1)}

/* A — blurred full-bleed wash */
.th-demo .th-a{min-height:520px;display:grid;place-items:center;text-align:center}
.th-demo .th-a .th-wash{position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);object-fit:cover;filter:blur(26px) brightness(.44) saturate(1.2);transform:scale(1.08)}
.th-demo .th-a .th-inner{position:relative;z-index:2;padding:64px 28px;max-width:860px}

/* B — feathered side crop */
.th-demo .th-b{min-height:540px;display:flex;align-items:center}
.th-demo .th-b .th-art{position:absolute;right:0;top:0;height:100%;width:60%;object-fit:cover;object-position:center 62%;-webkit-mask-image:linear-gradient(to right,transparent 0,rgba(0,0,0,.55) 32%,#000 72%);mask-image:linear-gradient(to right,transparent 0,rgba(0,0,0,.55) 32%,#000 72%)}
.th-demo .th-b .th-inner{position:relative;z-index:2;padding:64px 28px;max-width:640px}

/* C — framed poster on a themed stage */
.th-demo .th-c{padding-bottom:34px}
.th-demo .th-c .th-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:46px;align-items:center;padding:44px 0 30px}
.th-demo .th-c .th-frame{border:8px solid var(--yel);border-radius:14px;overflow:hidden;transform:rotate(2deg);box-shadow:0 22px 44px -20px rgba(0,0,0,.7)}
.th-demo .th-c .th-frame img{width:100%;height:auto;display:block}
.th-demo .th-neon{display:flex;justify-content:center;gap:34px;flex-wrap:wrap;border-top:1px solid rgba(255,191,31,.24);padding-top:22px}
.th-demo .th-neon div{text-align:center;font-family:'Bangers',cursive;font-size:19px;letter-spacing:.04em}
.th-demo .th-neon small{display:block;font-family:'Pacifico',cursive;font-size:12px;color:#a9987a;letter-spacing:0}

@media(max-width:880px){
  .th-demo .th-a{min-height:430px}
  .th-demo .th-b{min-height:auto}
  .th-demo .th-b .th-art{position:relative;width:100%;height:230px;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 55%);mask-image:linear-gradient(to bottom,transparent 0,#000 55%)}
  .th-demo .th-b{flex-direction:column-reverse}
  .th-demo .th-b .th-inner{padding:28px 28px 48px}
  .th-demo .th-c .th-grid{grid-template-columns:1fr;gap:30px}
}
`;

const EVENT = {
  eyebrow: "SÁBADO 29 DE AGOSTO · 8 PM",
  line1: "EL PALOMAZO",
  script: "en Casa",
  ribbon: "UNA NOCHE DE KARAOKE MEXICANO",
  sub: "Canta los éxitos de tus ídolos. 424 E Monroe Ave · Buckeye",
};

const NEON = [
  { label: "KARAOKE", note: "Tú Cantas", color: "var(--yel)" },
  { label: "DRINKS", note: "Bien Fríos", color: "var(--teal)" },
  { label: "GREAT FOOD", note: "Hecha con Amor", color: "var(--mag)" },
  { label: "GREAT MUSIC", note: "Puras Clásicas", color: "var(--orng)" },
  { label: "GOOD VIBES", note: "Toda la Noche", color: "var(--purp)" },
];

function Copy({ center = false }: { center?: boolean }) {
  return (
    <>
      <div className="th-eyebrow">{EVENT.eyebrow}</div>
      <div className="th-h1">{EVENT.line1}</div>
      <div className="th-scr">{EVENT.script}</div>
      <div className="th-ribbon">{EVENT.ribbon}</div>
      <div className="th-sub">{EVENT.sub}</div>
      <div
        className="th-ctas"
        style={center ? { justifyContent: "center" } : undefined}
      >
        <a className="th-btn th-btn-y" href="tel:623-306-2386">
          Reserve Your Table
        </a>
        <a className="th-btn th-btn-g" href="/menu">
          See the Menu
        </a>
      </div>
    </>
  );
}

export default async function TestHeroPage() {
  const hero = await getHeroFiesta();
  const src = hero?.src ?? "/images/FLY_LOTERIA.jpg";
  const alt = hero?.alt || hero?.cap || "Upcoming fiesta at Casa de Leyva";

  return (
    <div className="v8">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Header />

      <div className="th-demo">
        <div className="th-label">
          <b>A · Blurred wash</b>
          <span>
            Flyer scaled and blurred into pure atmosphere. Palette survives, artwork does not.
          </span>
        </div>
        <section className="th-stage th-a">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="th-wash" src={src} alt="" aria-hidden="true" />
          <div className="th-inner">
            <Copy center />
          </div>
        </section>

        <div className="th-label">
          <b>B · Feathered crop</b>
          <span>
            Art stays sharp, crop lands below the flyer&rsquo;s title block, left edge fades into the field.
          </span>
        </div>
        <section className="th-stage th-b">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="th-art" src={src} alt={alt} />
          <div className="th-inner">
            <Copy />
          </div>
        </section>

        <div className="th-label">
          <b>C · Framed poster</b>
          <span>
            Flyer untouched and whole; the section around it carries the theme.
          </span>
        </div>
        <section className="th-stage th-c">
          <div className="picado5" />
          <div className="wrap">
            <div className="th-grid">
              <div>
                <Copy />
              </div>
              <div className="th-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} />
              </div>
            </div>
            <div className="th-neon">
              {NEON.map((n) => (
                <div key={n.label} style={{ color: n.color }}>
                  {n.label}
                  <small>{n.note}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
