"use client";

import { useEffect, useState } from "react";

const TARGET = 10;
const DESSERT_AT = 5;
const PHONE_KEY = "casa_phone";

type CheckinResult = {
  name: string | null;
  progress: number;
  target: number;
  rewardEarned: "punch_dessert" | "punch_entree" | null;
  alreadyToday: boolean;
};

type Mode = "checkin" | "result" | "signup" | "joined";

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

function Dots({ progress }: { progress: number }) {
  return (
    <div className="hola-dots">
      {Array.from({ length: TARGET }).map((_, i) => {
        const n = i + 1;
        const on = n <= progress;
        const milestone = n === DESSERT_AT ? "dessert" : n === TARGET ? "entree" : "";
        return (
          <div key={n} className={`hd ${on ? "on" : ""} ${milestone}`}>
            {milestone ? "★" : n}
          </div>
        );
      })}
    </div>
  );
}

function nextRewardLine(progress: number): string {
  if (progress >= TARGET) return "";
  if (progress < DESSERT_AT) {
    const left = DESSERT_AT - progress;
    return `${left} more visit${left > 1 ? "s" : ""} 'til a free dessert 🍰`;
  }
  const left = TARGET - progress;
  return `${left} more visit${left > 1 ? "s" : ""} 'til a free entrée 🌮`;
}

export default function Hola() {
  const [mode, setMode] = useState<Mode>("checkin");
  const [remembered, setRemembered] = useState(false);

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);

  const [result, setResult] = useState<CheckinResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Remember the guest's phone on this device for one-tap check-ins next time.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PHONE_KEY);
      if (saved) {
        setPhone(saved);
        setRemembered(true);
      }
    } catch {
      /* localStorage unavailable — no problem, they just type it */
    }
  }, []);

  function remember(p: string) {
    try {
      localStorage.setItem(PHONE_KEY, p);
    } catch {
      /* ignore */
    }
  }

  function reset() {
    try {
      localStorage.removeItem(PHONE_KEY);
    } catch {
      /* ignore */
    }
    setRemembered(false);
    setPhone("");
    setName("");
    setEmail("");
    setBirthday("");
    setSmsConsent(false);
    setResult(null);
    setError("");
    setMode("checkin");
  }

  async function checkIn() {
    const p = digits(phone);
    if (p.length < 10) {
      setError("Please enter your 10-digit mobile number.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p }),
      });
      const data = await res.json();
      if (data.found === false) {
        // New guest — carry the phone into signup.
        setMode("signup");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      remember(p);
      setResult({
        name: data.name ?? null,
        progress: data.progress ?? 0,
        target: data.target ?? TARGET,
        rewardEarned: data.rewardEarned ?? null,
        alreadyToday: Boolean(data.alreadyCheckedInToday),
      });
      setMode("result");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    const p = digits(phone);
    if (!name.trim()) return setError("Please enter your name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (p.length < 10) return setError("Please enter your 10-digit mobile number.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: p, birthday, smsConsent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      remember(p);
      if (data.alreadyMember) {
        // Already in the system — just check them in.
        await checkIn();
        return;
      }
      setName((n) => n.split(" ")[0] || n); // keep first name for the greeting
      setMode("joined");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const firstName = (result?.name ?? "").split(" ")[0];

  return (
    <main className="hola">
      <div className="hola-picado" />
      <div className="hola-center">
      <div className="hola-card">
        <div className="hola-brand">
          <span className="scr">porque eres de la familia</span>
          <h1 className="pop">
            <span style={{ color: "var(--mag)" }}>CASA</span>{" "}
            <span style={{ color: "var(--teal)" }}>REWARDS</span>
          </h1>
        </div>

        {mode === "checkin" && (
          <>
            <p className="hola-lede">
              {remembered ? "¡Bienvenido de nuevo! Tap to check in." : "Welcome! Check in to earn your rewards."}
            </p>
            <label className="hola-label" htmlFor="hola-phone">Mobile number</label>
            <input
              id="hola-phone"
              className="hola-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(602) 555-1234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {error && <p className="hola-err">{error}</p>}
            <button className="hola-btn" onClick={checkIn} disabled={busy}>
              {busy ? "Checking in…" : "Check In"}
            </button>
            {remembered && (
              <button className="hola-link" onClick={reset}>Not you? Use a different number</button>
            )}
            <p className="hola-fine">
              New here? Enter your number and we&apos;ll get you signed up — it&apos;s free.
            </p>
          </>
        )}

        {mode === "result" && result && (
          <div className="hola-result">
            {result.alreadyToday ? (
              <>
                <div className="hola-emoji">👋</div>
                <h2 className="pop">
                  {firstName ? `HOLA, ${firstName.toUpperCase()}!` : "YOU'RE ALL SET!"}
                </h2>
                <p className="hola-lede">You&apos;re already checked in today — see you next visit!</p>
              </>
            ) : result.rewardEarned === "punch_entree" ? (
              <>
                <div className="hola-emoji">🌮🎉</div>
                <h2 className="pop">FREE ENTRÉE EARNED!</h2>
                <p className="hola-lede">
                  {firstName ? `Way to go, ${firstName}! ` : ""}Show this screen to your server to redeem. Your card starts fresh — ¡a comer!
                </p>
              </>
            ) : result.rewardEarned === "punch_dessert" ? (
              <>
                <div className="hola-emoji">🍰🎉</div>
                <h2 className="pop">FREE DESSERT EARNED!</h2>
                <p className="hola-lede">
                  {firstName ? `Nice, ${firstName}! ` : ""}Show this screen to your server. Keep going for a free entrée at 10.
                </p>
              </>
            ) : (
              <>
                <div className="hola-emoji">✅</div>
                <h2 className="pop">
                  {firstName ? `¡GRACIAS, ${firstName.toUpperCase()}!` : "VISIT LOGGED!"}
                </h2>
                <p className="hola-lede">{nextRewardLine(result.progress)}</p>
              </>
            )}
            <Dots progress={result.progress} />
            <p className="hola-count">{result.progress} / {TARGET} visits</p>
            <button className="hola-link" onClick={reset}>Not you? Use a different number</button>
          </div>
        )}

        {mode === "signup" && (
          <>
            <div className="hola-emoji">🌟</div>
            <h2 className="pop" style={{ textAlign: "center" }}>¡BIENVENIDO!</h2>
            <p className="hola-lede">Looks like you&apos;re new — join free and start earning today.</p>
            <label className="hola-label" htmlFor="su-name">Name</label>
            <input id="su-name" className="hola-input" type="text" value={name}
              onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <label className="hola-label" htmlFor="su-email">Email</label>
            <input id="su-email" className="hola-input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <div className="hola-row">
              <div>
                <label className="hola-label" htmlFor="su-phone">Mobile</label>
                <input id="su-phone" className="hola-input" type="tel" inputMode="numeric"
                  value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </div>
              <div>
                <label className="hola-label" htmlFor="su-bday">Birthday (MM/DD)</label>
                <input id="su-bday" className="hola-input" type="text" placeholder="08/15"
                  value={birthday} onChange={(e) => setBirthday(e.target.value)} />
              </div>
            </div>
            <label className="hola-check">
              <input type="checkbox" checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)} />
              <span>Yes! Text me Casa Rewards offers and updates.</span>
            </label>
            <p className="hola-consent">
              By checking this box, you agree to receive recurring automated marketing and informational
              text messages from Casa de Leyva at the mobile number provided. Consent is not a condition
              of any purchase. Msg &amp; data rates may apply. Reply HELP for help, STOP to cancel.
            </p>
            {error && <p className="hola-err">{error}</p>}
            <button className="hola-btn" onClick={join} disabled={busy}>
              {busy ? "Joining…" : "Join Casa Rewards"}
            </button>
          </>
        )}

        {mode === "joined" && (
          <div className="hola-result">
            <div className="hola-emoji">🧀🎉</div>
            <h2 className="pop">YOU&apos;RE IN{name ? `, ${name.toUpperCase()}` : ""}!</h2>
            <p className="hola-lede">
              Welcome to la familia. Your <b>free chips &amp; queso</b> is ready — show your server to redeem on this visit.
            </p>
            <p className="hola-fine">Scan again on your next visit to start earning toward a free dessert and entrée.</p>
            <button className="hola-link" onClick={reset}>Done</button>
          </div>
        )}
      </div>
      </div>
    </main>
  );
}
