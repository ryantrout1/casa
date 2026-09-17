export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import Compose from "../Compose";
import { parseDraftConfig } from "@/lib/schedule";
import { type ChannelId } from "@/lib/publish";

// The campaign composer, on its own page. Opens a saved draft or scheduled
// campaign with ?draft=<id>.
export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const sql = db();
  const { draft } = await searchParams;

  const countRows = (await sql`
    select count(*)::int as subscribers
    from members
    where email_subscribed = true
      and email is not null
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'
  `) as { subscribers: number }[];
  const subscribers = countRows[0].subscribers;

  let initialDraft:
    | {
        id: string;
        subject: string;
        body: string;
        channels: ChannelId[];
        flyer: ReturnType<typeof parseDraftConfig>["flyer"];
        status: string;
        scheduledFor: string | null;
      }
    | undefined;
  if (draft) {
    const drows = (await sql`
      select id, subject, body, publish_config, status, scheduled_for
      from campaigns where id = ${draft} and status in ('draft', 'scheduled')
    `) as {
      id: string;
      subject: string;
      body: string;
      publish_config: unknown;
      status: string;
      scheduled_for: string | null;
    }[];
    if (drows[0]) {
      const cfg = parseDraftConfig(drows[0].publish_config);
      initialDraft = {
        id: drows[0].id,
        subject: drows[0].subject,
        body: drows[0].body,
        channels: cfg.channels,
        flyer: cfg.flyer,
        status: drows[0].status,
        scheduledFor: drows[0].scheduled_for
          ? new Date(drows[0].scheduled_for).toISOString()
          : null,
      };
    }
  }

  return (
    <>
      <Link href="/cocina/campaigns" className="back">&larr; All campaigns</Link>
      <h1>{initialDraft ? "Edit campaign" : "New campaign"}</h1>
      <p className="lede">
        Build it once and send it everywhere. Email goes to{" "}
        <strong>{subscribers}</strong> opted-in {subscribers === 1 ? "member" : "members"}.
      </p>
      <Compose
        key={initialDraft?.id ?? "new"}
        subscriberCount={subscribers}
        defaultTestEmail="ryan@casadeleyva.com"
        initialDraft={initialDraft}
      />
    </>
  );
}
