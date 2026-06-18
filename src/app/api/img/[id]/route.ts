import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const sql = db();
    const rows = (await sql`
      select content_type, data_base64 from email_images where id = ${id} limit 1
    `) as { content_type: string; data_base64: string }[];

    if (rows.length === 0) {
      return new Response("Not found", { status: 404 });
    }

    const bytes = Buffer.from(rows[0].data_base64, "base64");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": rows[0].content_type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Error", { status: 500 });
  }
}
