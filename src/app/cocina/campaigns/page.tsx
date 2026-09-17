export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { phoenixToday, websiteNow, type WebsiteRow } from "@/lib/websiteNow";
import {
  campaignRow,
  channelsFromConfig,
  tabCounts,
  tabOf,
  type CampaignFiesta,
  type ChannelState,
  type Tab,
} from "@/lib/campaignStatus";

// The Campaigns list. The composer lives at /campaigns/new; every status and
// channel state shown here comes from lib/campaignStatus.

type Row = {
  id: string;
  subject: string;
  status: string;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
  scheduled_for: string | null;
  publish_config: unknown;
  opens: number;
  clicks: number;
  dispatches: { channel: string; status: string }[] | null;
  image_url: string | null;
  f_id: string | null;
  f_is_hero: boolean | null;
  f_in_grid: boolean | null;
  f_on_fiestas_page: boolean | null;
  f_is_evergreen: boolean | null;
  f_starts_at: string | null;
  f_event_date: string | null;
};

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live now" },
  { key: "scheduled", label: "Scheduled" },
  { key: "drafts", label: "Drafts" },
  { key: "past", label: "Past" },
];

const STATE_CLS: Record<ChannelState, string> = {
  live: "pill good",
  done: "pill good",
  planned: "pill",
  attention: "pill warn",
  off: "pill",
};
const STATE_WORD: Record<ChannelState, string> = {
  live: "live",
  done: "done",
  planned: "planned",
  attention: "needs attention",
  off: "not used",
};
const STATUS_CLS: Record<string, string> = {
  live: "pill good",
  scheduled: "pill",
  draft: "pill",
  ended: "pill",
  sent: "pill",
  failed: "pill warn",
};

function fmt(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
function pct(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 100)}%` : "";
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; tab?: string }>;
}) {
  const { draft, tab } = await searchParams;
  // Old draft links pointed here; the composer moved.
  if (draft) redirect(`/cocina/campaigns/new?draft=${encodeURIComponent(draft)}`);

  const sql = db();
  const nowMs = Date.now();
  const today = phoenixToday(nowMs);
  const active: Tab = TABS.some((t) => t.key === tab) ? (tab as Tab) : "all";

  const rows = (await sql`
    select c.id, c.subject, c.status, c.sent_count, c.sent_at, c.created_at,
      c.scheduled_for, c.publish_config,
      (select count(distinct s.id) from email_sends s join email_events e on e.send_id = s.id
        where s.campaign_id = c.id and e.event_type = 'email.opened')::int as opens,
      (select count(distinct s.id) from email_sends s join email_events e on e.send_id = s.id
        where s.campaign_id = c.id and e.event_type = 'email.clicked')::int as clicks,
      (select json_agg(json_build_object('channel', d.channel, 'status', d.status))
        from campaign_dispatches d where d.campaign_id = c.id) as dispatches,
      f.image_url, f.id as f_id, f.is_hero as f_is_hero, f.in_grid as f_in_grid,
      f.on_fiestas_page as f_on_fiestas_page, f.is_evergreen as f_is_evergreen,
      to_char(f.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as f_starts_at,
      f.event_date::text as f_event_date
    from campaigns c
    left join fiestas f on f.id = c.fiesta_id
    order by coalesce(c.sent_at, c.scheduled_for, c.created_at) desc
    limit 100
  `) as Row[];

  const views = rows.map((r) => {
    const fiesta: CampaignFiesta | null = r.f_id
      ? {
          is_hero: !!r.f_is_hero,
          in_grid: !!r.f_in_grid,
          on_fiestas_page: !!r.f_on_fiestas_page,
          is_evergreen: !!r.f_is_evergreen,
          starts_at: r.f_starts_at,
          event_date: r.f_event_date,
        }
      : null;
    const view = campaignRow(
      {
        status: r.status,
        sentCount: r.sent_count,
        selected: channelsFromConfig(r.publish_config),
        dispatches: r.dispatches ?? [],
        fiesta,
      },
      today,
      nowMs,
    );
    return { r, view };
  });

  const counts = tabCounts(views.map((v) => v.view.status));
  const shown = active === "all" ? views : views.filter((v) => tabOf(v.view.status) === active);

  // Header cards: what the homepage shows, what goes out next, what failed.
  const heroRows = (await sql`
    select id, coalesce(caption, hero_title) as name, image_url, hero_plate_url,
      is_hero, in_grid, is_evergreen, event_date::text as event_date,
      to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as starts_at,
      to_char(hero_live_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hero_live_at,
      extract(epoch from coalesce(featured_at, created_at))::float8 as sort_key
    from fiestas where is_hero
  `) as (WebsiteRow & { name: string | null; image_url: string; hero_plate_url: string | null })[];
  const now = websiteNow(heroRows, today, nowMs);
  const next = views
    .filter((v) => v.view.status === "scheduled" && v.r.scheduled_for)
    .sort((a, b) => Date.parse(a.r.scheduled_for!) - Date.parse(b.r.scheduled_for!))[0];
  const failed = views.filter((v) => v.view.status === "failed" || v.view.channels.some((c) => c.state === "attention"));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>Campaigns</h1>
          <p className="lede" style={{ marginBottom: 0 }}>
            One campaign per event or promo. Build it once, send it everywhere.
          </p>
        </div>
        <Link href="/cocina/campaigns/new" className="cta-link">
          + New campaign
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          margin: "20px 0 24px",
        }}
      >
        <div className="panel" style={{ margin: 0, display: "flex", gap: 12, alignItems: "center" }}>
          {now.live ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={now.live.hero_plate_url ?? now.live.image_url}
              alt=""
              style={{ width: 72, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
            />
          ) : null}
          <div style={{ display: "grid", gap: 2 }}>
            <span className="muted" style={{ fontSize: 12 }}>On the homepage now</span>
            <strong>{now.live ? now.live.name : "The standard hero"}</strong>
            <Link href="/cocina/website" style={{ fontSize: 12 }}>See the website</Link>
          </div>
        </div>
        <div className="panel" style={{ margin: 0, display: "grid", gap: 2 }}>
          <span className="muted" style={{ fontSize: 12 }}>Next scheduled</span>
          {next ? (
            <>
              <strong>{next.r.subject || "(untitled)"}</strong>
              <span className="muted" style={{ fontSize: 12 }}>{fmt(next.r.scheduled_for!)}</span>
            </>
          ) : (
            <strong>Nothing scheduled</strong>
          )}
        </div>
        <div className="panel" style={{ margin: 0, display: "grid", gap: 2 }}>
          <span className="muted" style={{ fontSize: 12 }}>Needs attention</span>
          {failed.length > 0 ? (
            <>
              <strong>
                {failed.length === 1 ? "1 campaign had a problem" : `${failed.length} campaigns had a problem`}
              </strong>
              <Link href={`/cocina/campaigns/${failed[0].r.id}`} style={{ fontSize: 12 }}>
                Open {failed[0].r.subject || "it"}
              </Link>
            </>
          ) : (
            <strong>All good</strong>
          )}
        </div>
      </div>

      <div className="panel">
        <nav aria-label="Filter campaigns" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "all" ? "/cocina/campaigns" : `/cocina/campaigns?tab=${t.key}`}
              aria-current={t.key === active ? "page" : undefined}
              className={t.key === active ? "tab-link on" : "tab-link"}
            >
              {t.label} <span className="muted">{counts[t.key]}</span>
            </Link>
          ))}
        </nav>

        {shown.length === 0 ? (
          <p className="muted">Nothing here.</p>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Channels</th>
                <th>Email results</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ r, view }) => {
                const href =
                  view.status === "draft" || (view.status === "scheduled" && r.status === "scheduled")
                    ? `/cocina/campaigns/new?draft=${r.id}`
                    : `/cocina/campaigns/${r.id}`;
                const when = r.sent_at ?? r.scheduled_for ?? r.created_at;
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {r.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.image_url}
                            alt=""
                            style={{ width: 36, height: 44, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                          />
                        ) : (
                          <span style={{ width: 36, height: 44, borderRadius: 4, background: "#f1f3f7", flexShrink: 0 }} />
                        )}
                        <Link href={href}>{r.subject || "(untitled)"}</Link>
                      </div>
                    </td>
                    <td>
                      <span className={STATUS_CLS[view.status]}>{view.label}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {view.channels.map((c) => (
                          <span
                            key={c.key}
                            className={STATE_CLS[c.state]}
                            style={c.state === "off" ? { opacity: 0.45 } : undefined}
                            title={`${c.label}: ${STATE_WORD[c.state]}`}
                          >
                            {c.key === "google" ? "Google" : c.label}
                            <span className="sr-only">: {STATE_WORD[c.state]}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {r.sent_count > 0 ? (
                        <span>
                          {r.sent_count} sent
                          <span className="muted">
                            {" "}· {pct(r.opens, r.sent_count)} opened · {r.clicks} clicked
                          </span>
                        </span>
                      ) : (
                        <span className="muted">No email</span>
                      )}
                    </td>
                    <td className="muted">
                      {view.status === "scheduled" && r.scheduled_for ? "Goes " : ""}
                      {fmt(when)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
