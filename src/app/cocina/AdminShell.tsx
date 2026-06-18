"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; href?: string; icon: string; soon?: boolean };
type Group = { group: string; items: Item[] };

const NAV: Group[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/cocina", icon: "dashboard" },
      { label: "Bookings", href: "/cocina/bookings", icon: "calendar" },
    ],
  },
  {
    group: "Members",
    items: [
      { label: "All Members", href: "/cocina/members", icon: "members" },
      { label: "Rewards", href: "/cocina/rewards", icon: "gift" },
    ],
  },
  {
    group: "Marketing",
    items: [
      { label: "Campaigns", href: "/cocina/campaigns", icon: "mail" },
      { label: "Automations", icon: "bolt", soon: true },
      { label: "Text (SMS)", icon: "sms", soon: true },
    ],
  },
  { group: "Insights", items: [{ label: "Analytics", icon: "chart", soon: true }] },
  { group: "Settings", items: [{ label: "Settings", icon: "gear", soon: true }] },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/cocina") return pathname === "/cocina";
  return pathname === href || pathname.startsWith(href + "/");
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    members: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c0-3 2.7-5 5.5-5s5.5 2 5.5 5" />
        <path d="M16 5.5a3 3 0 0 1 0 5.5" />
        <path d="M20.5 20c0-2.3-1.6-4-3.7-4.6" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3.5 7 8.5 6 8.5-6" />
      </>
    ),
    gift: (
      <>
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M5 12v9h14v-9" />
        <path d="M12 8v13" />
        <path d="M12 8C12 5 10.5 3.5 9 4s-1 3.5 3 4z" />
        <path d="M12 8c0-3 1.5-4.5 3-4s1 3.5-3 4z" />
      </>
    ),
    bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
    calendar: (
      <>
        <rect x="3" y="4.5" width="18" height="16" rx="2" />
        <path d="M3 9.5h18" />
        <path d="M8 3v3M16 3v3" />
      </>
    ),
    sms: <path d="M21 11.5a7.5 7.5 0 0 1-10.8 6.7L4 20l1.8-5.2A7.5 7.5 0 1 1 21 11.5z" />,
    chart: (
      <>
        <path d="M4 20V11" />
        <path d="M10 20V4" />
        <path d="M16 20v-6" />
        <path d="M3 20h18" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
      </>
    ),
  };
  return (
    <svg
      className="ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? null}
    </svg>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/cocina";
  const current =
    NAV.flatMap((g) => g.items).find((i) => i.href && isActive(i.href, pathname))?.label ??
    "Admin";

  return (
    <div className="cq">
      <aside className="cq-sidebar">
        <div className="cq-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/email/logo.jpg" alt="Casa de Leyva" className="cq-logo" />
          <div className="cq-brand-tag">Rewards Admin</div>
        </div>
        <nav className="cq-nav">
          {NAV.map((g) => (
            <div className="cq-group" key={g.group}>
              <div className="cq-group-label">{g.group}</div>
              {g.items.map((it) =>
                it.soon || !it.href ? (
                  <div className="cq-item soon" key={it.label}>
                    <Icon name={it.icon} />
                    <span>{it.label}</span>
                    <span className="tag">Soon</span>
                  </div>
                ) : (
                  <Link
                    key={it.label}
                    href={it.href}
                    className={`cq-item${isActive(it.href, pathname) ? " active" : ""}`}
                  >
                    <Icon name={it.icon} />
                    <span>{it.label}</span>
                  </Link>
                ),
              )}
            </div>
          ))}
        </nav>
        <div className="cq-foot">
          <button
            type="button"
            className="cq-lock"
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/cocina-login";
            }}
          >
            Lock admin
          </button>
        </div>
      </aside>
      <div className="cq-main">
        <div className="cq-topbar">
          <span>Casa Rewards</span>
          <span className="sep">›</span>
          <span className="cur">{current}</span>
        </div>
        <div className="cq-inner">{children}</div>
      </div>
    </div>
  );
}
