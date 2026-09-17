import { describe, it, expect } from "vitest";
import {
  campaignRow,
  channelsFromConfig,
  tabCounts,
  tabOf,
  type CampaignInput,
} from "./campaignStatus";

// One campaign becomes one list row: a status, and a state for each channel
// the list shows (website, email, Google). Everything the Campaigns page
// labels comes from here.

const NOW = Date.parse("2026-09-17T19:00:00Z");
const TODAY = "2026-09-17";

const LIVE_FIESTA = {
  id: "f1",
  sort_key: 1,
  is_hero: true,
  in_grid: false,
  on_fiestas_page: false,
  is_evergreen: false,
  starts_at: "2026-09-20T03:00:00Z",
  event_date: "2026-09-19",
  hero_live_at: null,
};

function c(o: Partial<CampaignInput> = {}): CampaignInput {
  return {
    status: "published",
    sentCount: 0,
    selected: [],
    dispatches: [],
    fiesta: null,
    ...o,
  };
}

const states = (r: ReturnType<typeof campaignRow>) =>
  Object.fromEntries(r.channels.map((x) => [x.key, x.state]));

describe("channelsFromConfig", () => {
  it("reads the channel list a draft carries, ignoring junk", () => {
    expect(channelsFromConfig({ channels: ["email", "hero", "bogus", 4] })).toEqual(["email", "hero"]);
    expect(channelsFromConfig(null)).toEqual([]);
    expect(channelsFromConfig({ channels: "email" })).toEqual([]);
  });
});

describe("campaignRow: status", () => {
  it.each([
    ["draft", "draft", "Draft"],
    ["scheduled", "scheduled", "Scheduled"],
    ["sending", "scheduled", "Sending"],
    ["failed", "failed", "Failed"],
  ] as const)("%s -> %s", (status, want, label) => {
    const r = campaignRow(c({ status }), TODAY, NOW);
    expect(r.status).toBe(want);
    expect(r.label).toBe(label);
  });

  it("is live while its website fiesta is current and on a surface", () => {
    const r = campaignRow(
      c({ status: "published", dispatches: [{ channel: "hero", status: "ok" }], fiesta: LIVE_FIESTA }),
      TODAY,
      NOW,
    );
    expect(r.status).toBe("live");
    expect(r.label).toBe("Live now");
  });

  it("has ended once the fiesta's event is over", () => {
    const r = campaignRow(
      c({
        status: "sent",
        sentCount: 200,
        dispatches: [{ channel: "hero", status: "ok" }, { channel: "email", status: "ok" }],
        fiesta: { ...LIVE_FIESTA, starts_at: "2026-09-10T00:00:00Z", event_date: "2026-09-09" },
      }),
      TODAY,
      NOW,
    );
    expect(r.status).toBe("ended");
    expect(r.label).toBe("Ended");
  });

  it("has ended once every website surface is turned off, even before the event", () => {
    const r = campaignRow(
      c({ fiesta: { ...LIVE_FIESTA, is_hero: false }, dispatches: [{ channel: "hero", status: "ok" }] }),
      TODAY,
      NOW,
    );
    expect(r.status).toBe("ended");
  });

  it("is simply sent for an email-only campaign", () => {
    const r = campaignRow(c({ status: "sent", sentCount: 220 }), TODAY, NOW);
    expect(r.status).toBe("sent");
    expect(r.label).toBe("Sent");
  });

  it("treats an unknown stored status as sent rather than hiding it", () => {
    expect(campaignRow(c({ status: "weird" }), TODAY, NOW).status).toBe("sent");
  });
});

describe("campaignRow: channel states", () => {
  it("shows website, email and Google, in that order", () => {
    expect(campaignRow(c(), TODAY, NOW).channels.map((x) => x.key)).toEqual([
      "website",
      "email",
      "google",
    ]);
  });

  it("marks what a draft will use as planned", () => {
    const r = campaignRow(c({ status: "draft", selected: ["email", "grid"] }), TODAY, NOW);
    expect(states(r)).toEqual({ website: "planned", email: "planned", google: "off" });
  });

  it("marks the website live while the fiesta is showing, and done after", () => {
    const d = [{ channel: "hero", status: "ok" }];
    expect(states(campaignRow(c({ dispatches: d, fiesta: LIVE_FIESTA }), TODAY, NOW)).website).toBe("live");
    expect(
      states(
        campaignRow(c({ dispatches: d, fiesta: { ...LIVE_FIESTA, is_hero: false } }), TODAY, NOW),
      ).website,
    ).toBe("done");
  });

  it("marks a failed dispatch as needing attention", () => {
    const r = campaignRow(
      c({ status: "failed", dispatches: [{ channel: "email", status: "failed" }, { channel: "grid", status: "failed" }] }),
      TODAY,
      NOW,
    );
    expect(states(r)).toMatchObject({ website: "attention", email: "attention" });
  });

  it("counts a sent email as done, including sends from before dispatch tracking", () => {
    expect(states(campaignRow(c({ dispatches: [{ channel: "email", status: "ok" }] }), TODAY, NOW)).email).toBe("done");
    expect(states(campaignRow(c({ status: "sent", sentCount: 5 }), TODAY, NOW)).email).toBe("done");
  });

  it("treats a skipped email (no subscribers) as done, not failed", () => {
    expect(states(campaignRow(c({ dispatches: [{ channel: "email", status: "skipped" }] }), TODAY, NOW)).email).toBe("done");
  });

  it("keeps Google off while it is not connected", () => {
    expect(states(campaignRow(c({ status: "draft", selected: ["email"] }), TODAY, NOW)).google).toBe("off");
  });
});

describe("tabs", () => {
  it("files each status under one tab", () => {
    expect(tabOf("live")).toBe("live");
    expect(tabOf("scheduled")).toBe("scheduled");
    expect(tabOf("draft")).toBe("drafts");
    expect(tabOf("ended")).toBe("past");
    expect(tabOf("sent")).toBe("past");
    expect(tabOf("failed")).toBe("past");
  });

  it("counts every tab, with all as the total", () => {
    expect(tabCounts(["live", "draft", "draft", "sent", "ended", "scheduled"])).toEqual({
      all: 6,
      live: 1,
      scheduled: 1,
      drafts: 2,
      past: 2,
    });
    expect(tabCounts([])).toEqual({ all: 0, live: 0, scheduled: 0, drafts: 0, past: 0 });
  });
});
