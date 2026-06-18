import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function tokenFor(passcode: string): Promise<string> {
  const data = new TextEncoder().encode("casa-rewards::" + passcode);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: Request) {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) return NextResponse.json({ ok: true }); // no gate configured

  const body = await req.json().catch(() => ({}));
  const submitted = String(body.passcode ?? "");
  if (submitted !== passcode) {
    return NextResponse.json({ error: "That passcode isn't right." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("casa_admin", await tokenFor(passcode), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
