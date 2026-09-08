import type { Flyer } from "@/lib/fiestas";
import type { MotifPlan } from "@/lib/heroMotif";
import { letterColors } from "@/lib/heroMotif";
import type { HeroView } from "@/lib/heroViews";
import HeroRotator from "../HeroRotator";
import PapelPicado from "./PapelPicado";

// The motif takeover. Where FiestaHero crops the flyer and lays type beside it,
// this draws the composition natively from the row's palette and never renders
// the flyer at all — the artwork stays in the fiestas grid and the campaign
// email, where a portrait poster works.
//
// Ornament (lotería cards, fireworks, neon icons) is NOT here yet; phases 4-6
// add one component per motif. What this phase establishes is the shell every
// one of them slots into: the ground, the papel picado, the type stack, and the
// grid that reflows those pieces on a phone.
//
// Deliberately NOT one big SVG. The pieces are separate elements in a CSS grid
// so the mobile layout is a media query rather than a second viewBox chosen by
// JavaScript — no viewport detection, no hydration mismatch, no layout that
// depends on when the client hydrates.

export default function MotifHero({
  hero,
  views,
  plan,
}: {
  hero: Flyer;
  views: HeroView[];
  plan: MotifPlan;
}) {
  if (plan.motif === "none") return null;

  // Per-letter colours, one array per language. The primary headline may carry
  // colours the admin stored; the alternate is a different length, so it always
  // cycles — letterColors handles both and gates both for contrast.
  const perView = views.map((v, i) =>
    i === 0 && plan.motif !== "photo_band"
      ? plan.titleColors
      : letterColors(v.title, plan),
  );

  return (
    <section
      className={`motifhero mo-${plan.motif} sec`}
      style={
        {
          "--mo-ground": plan.ground,
          "--mo-ink": plan.ink,
          "--mo-1": plan.palette[0],
          "--mo-2": plan.palette[1] ?? plan.palette[0],
          "--mo-3": plan.palette[2] ?? plan.palette[0],
        } as React.CSSProperties
      }
    >
      <div className="picado-wrap" style={{ color: plan.ink }}>
        <PapelPicado palette={plan.palette} />
      </div>

      {plan.motif === "photo_band" ? (
        <div className="band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.src}
            alt={hero.alt || hero.cap || ""}
            style={{
              // The band is a horizontal slice of the poster. Its centre in
              // object-position terms is top + height/2, rescaled so that a
              // band of height h can still reach both edges: at h=100 the only
              // valid centre is 50%, and the expression yields exactly that
              // rather than dividing by zero.
              objectPosition:
                plan.bandHeight >= 100
                  ? "center 50%"
                  : `center ${Math.round(
                      (plan.bandTop / (100 - plan.bandHeight)) * 100,
                    )}%`,
              aspectRatio: `100 / ${plan.bandHeight}`,
            }}
          />
        </div>
      ) : null}

      <div className="wrap">
        <HeroRotator views={views} titleColors={perView} />
      </div>
    </section>
  );
}
