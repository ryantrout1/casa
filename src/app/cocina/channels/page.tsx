import { CHANNELS, type ChannelAvailability } from "@/lib/channels";

// Every place a campaign can go. Rendered straight from the registry, so this
// page and the campaign screens can never disagree about what is connected.

const STATE: Record<ChannelAvailability, { label: string; cls: string }> = {
  connected: { label: "Connected", cls: "pill good" },
  not_connected: { label: "Not connected", cls: "pill warn" },
  coming_later: { label: "Coming later", cls: "pill" },
};

export default function ChannelsPage() {
  return (
    <>
      <h1>Channels</h1>
      <p className="lede">
        The places a campaign can go. Connect each one once; after that it is a switch on every
        campaign.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {CHANNELS.map((c) => {
          const st = STATE[c.availability];
          return (
            <div
              key={c.key}
              className="panel"
              style={{
                margin: 0,
                display: "grid",
                gap: 10,
                alignContent: "start",
                opacity: c.availability === "coming_later" ? 0.75 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <h2 style={{ margin: 0 }}>{c.label}</h2>
                <span className={st.cls}>{st.label}</span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                {c.description}
              </p>
              {c.availability === "connected" ? (
                <span className="muted" style={{ fontSize: 12 }}>Ready to use on any campaign.</span>
              ) : c.availability === "not_connected" ? (
                <button type="button" disabled className="pill" style={{ justifySelf: "start", minHeight: 32, opacity: 0.6 }}>
                  Connect (not available yet)
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
