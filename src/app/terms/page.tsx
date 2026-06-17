import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions — Casa de Leyva",
  description:
    "Terms & Conditions for Casa de Leyva, including text messaging (SMS) program terms, Casa Rewards, and website use.",
};

export default function TermsPage() {
  return (
    <div className="v8">
      <Header />
      <div className="picado5"></div>
      <section className="legal sec">
        <div className="wrap">
          <div className="lwrap">
            <span className="scr">the fine print</span>
            <h1>Terms &amp; Conditions</h1>
            <div className="eff">Last updated: June 16, 2026</div>
            <p className="intro">
              These Terms &amp; Conditions govern your use of the Casa de Leyva
              website and the Casa Rewards program, including our text messaging
              program.
            </p>

            <div className="toc">
              <a href="#sms">Text Messaging (SMS) Terms</a>
              <a href="#rewards">Casa Rewards</a>
              <a href="#website">Use of the Website</a>
              <a href="#liability">Disclaimers &amp; Liability</a>
            </div>

            <h2 id="sms">Text Messaging (SMS) Terms</h2>
            <p>
              By providing your mobile number and opting in — for example, by
              checking the SMS consent box when you join Casa Rewards — you agree
              to the following:
            </p>
            <ul>
              <li>
                <b>Program.</b> Casa de Leyva sends recurring automated marketing
                and informational text messages (such as promotions, offers,
                events, and Casa Rewards updates) to subscribers.
              </li>
              <li>
                <b>Consent is not a condition of purchase.</b> You do not have to
                agree to receive texts in order to buy anything from us.
              </li>
              <li>
                <b>Message frequency.</b> Message frequency varies.
              </li>
              <li>
                <b>Cost.</b> Message and data rates may apply, according to your
                mobile carrier&rsquo;s plan.
              </li>
              <li>
                <b>Help.</b> For help, reply HELP to any message or contact us at{" "}
                <a href="tel:6233062386">623-306-2386</a>.
              </li>
              <li>
                <b>Opt out.</b> You can cancel at any time by replying STOP to any
                message. After you reply STOP, we will send one confirmation
                message and then stop sending texts. To rejoin, sign up again.
              </li>
              <li>
                <b>Carriers.</b> Mobile carriers are not liable for delayed or
                undelivered messages.
              </li>
              <li>
                <b>Privacy.</b> Your information is handled in line with our{" "}
                <a href="/privacy">Privacy Policy</a>. Mobile opt-in data and
                consent are not shared with third parties.
              </li>
            </ul>

            <h2 id="rewards">Casa Rewards</h2>
            <p>
              Casa Rewards is a loyalty program offered at Casa de Leyva. Rewards,
              visit thresholds, and benefits are subject to change, may not be
              combined unless stated, have no cash value, and may expire. We may
              modify or end the program at any time.
            </p>

            <h2 id="website">Use of the Website</h2>
            <p>
              You agree to use our website lawfully and not to misuse it. The
              content on this site — including text, images, logos, and design —
              is owned by or licensed to Casa de Leyva and may not be used without
              our permission.
            </p>

            <h2 id="liability">Disclaimers &amp; Limitation of Liability</h2>
            <p>
              The website is provided &ldquo;as is&rdquo; without warranties of any
              kind. To the fullest extent permitted by law, Casa de Leyva is not
              liable for any indirect or incidental damages arising from your use
              of the site or the messaging program.
            </p>

            <h2>Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Arizona.
            </p>

            <h2>Changes</h2>
            <p>
              We may update these Terms from time to time. Changes take effect when
              posted on this page.
            </p>

            <h2>Contact</h2>
            <p>
              Casa de Leyva · 424 E Monroe Ave, Buckeye, AZ 85326 ·{" "}
              <a href="tel:6233062386">623-306-2386</a> · casadeleyva.com
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
