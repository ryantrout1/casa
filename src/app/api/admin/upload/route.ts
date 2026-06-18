import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4_000_000; // ~4MB, under Vercel's request body limit

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Please upload an image file." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is too large (max ~4MB). Try compressing it." },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString("base64");

    const sql = db();
    const rows = (await sql`
      insert into email_images (filename, content_type, data_base64)
      values (${file.name}, ${file.type}, ${base64})
      returning id
    `) as { id: string }[];

    const origin = new URL(req.url).origin;
    return NextResponse.json({ url: `${origin}/api/img/${rows[0].id}` });
  } catch {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
