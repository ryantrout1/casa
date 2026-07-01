import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { OWNED_SURFACES, type ChannelId } from "@/lib/publish";

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

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed." },
      { status: 500 },
    );
  }
}
