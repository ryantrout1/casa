import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { OWNED_SURFACES, type ChannelId } from "@/lib/publish";
import { fromPhoenixFields, phoenixDateOf } from "@/lib/heroDates";

export const dynamic = "force-dynamic";

// Manage existing fiestas from /cocina/fiestas: turn a surface on/off, or remove
// the fiesta entirely. The reverse of the campaign Publish action. Auth is the
// existing /api/admin/* middleware gate.
export async function POST(req: Request) {
  try {
    const sql = db();
    const body = await req.json();
    const action = String(body.action ?? "");
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Missing fiesta id." }, { status: 400 });

    if (action === "toggle") {
      const surface = String(body.surface ?? "") as ChannelId;
      const value = Boolean(body.value);
      if (!OWNED_SURFACES.includes(surface)) {
        return NextResponse.json({ error: "Unknown surface." }, { status: 400 });
      }

      if (surface === "hero") {
        if (value) {
          // Single-hero invariant: demote the current hero before promoting this one.
          await sql`update fiestas set is_hero = false where is_hero = true`;
          await sql`update fiestas set is_hero = true where id = ${id}`;
        } else {
          await sql`update fiestas set is_hero = false where id = ${id}`;
        }
      } else if (surface === "grid") {
        await sql`update fiestas set in_grid = ${value} where id = ${id}`;
      } else {
        await sql`update fiestas set on_fiestas_page = ${value} where id = ${id}`;
      }

      revalidatePath("/");
      revalidatePath("/fiestas");
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      // Detach any campaign that announced this fiesta (keep the send history),
      // then remove the fiesta from every surface.
      await sql`update campaigns set fiesta_id = null where fiesta_id = ${id}`;
      await sql`delete from fiestas where id = ${id}`;
      revalidatePath("/");
      revalidatePath("/fiestas");
      return NextResponse.json({ ok: true });
    }

    if (action === "sethero") {
      // Hero copy + start time. Blank strings become NULL so clearing a field
      // in the form actually clears it (and a null hero_title is the signal
      // Hero.tsx uses to fall back to the evergreen hero).
      const blank = (v: unknown) => {
        const s = typeof v === "string" ? v.trim() : "";
        return s === "" ? null : s;
      };
      const lang = body.heroLang === "es" ? "es" : "en";
      const startsAt = fromPhoenixFields(
        String(body.startDate ?? ""),
        String(body.startTime ?? ""),
      );
      // Keep event_date consistent with the instant the admin just set, so the
      // date column and the grid ordering don't disagree with the hero.
      const eventDate = phoenixDateOf(startsAt);

      await sql`
        update fiestas set
          starts_at   = ${startsAt},
          event_date  = coalesce(${eventDate}::date, event_date),
          hero_title  = ${blank(body.heroTitle)},
          hero_script = ${blank(body.heroScript)},
          hero_ribbon = ${blank(body.heroRibbon)},
          hero_sub    = ${blank(body.heroSub)},
          hero_lang   = ${lang}
        where id = ${id}
      `;

      revalidatePath("/");
      revalidatePath("/fiestas");
      return NextResponse.json({ ok: true, startsAt, eventDate });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed." },
      { status: 500 },
    );
  }
}
