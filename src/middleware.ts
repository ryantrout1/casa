import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function tokenFor(passcode: string): Promise<string> {
  const data = new TextEncoder().encode("casa-rewards::" + passcode);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const passcode = process.env.ADMIN_PASSCODE;
  // Gate is OFF until a passcode is configured — set ADMIN_PASSCODE to lock.
  if (!passcode) return NextResponse.next();

  const cookie = req.cookies.get("casa_admin")?.value;
  if (cookie && cookie === (await tokenFor(passcode))) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/cocina-login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/cocina", "/cocina/:path*", "/api/admin/:path*"],
};
