"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { bannerLines, noticeFor } from "@/lib/closures";
import { phoenixToday } from "@/lib/websiteNow";

type Lines = { lead: string; reopen: string };

// The holiday closure strip at the top of every public page (lib/closures).
//
// The layout renders it with `initial`, worked out on the server. Most pages
// are static, so for them "the server" means the last build, which may be days
// old. After mount the banner works the date out again from the visitor's
// clock, in Phoenix time, so a stale build can neither keep a finished notice
// up nor miss one that started since.
export default function ClosureBanner({ initial }: { initial: Lines | null }) {
  const pathname = usePathname();
  const [lines, setLines] = useState<Lines | null>(initial);

  useEffect(() => {
    const today = phoenixToday(Date.now());
    const c = noticeFor(today);
    setLines(c ? bannerLines(c, today) : null);
  }, []);

  if (!lines || pathname?.startsWith("/cocina")) return null;

  return (
    <div className="closure-bar" role="status">
      <strong>{lines.lead}</strong> <span>{lines.reopen}</span>
    </div>
  );
}
