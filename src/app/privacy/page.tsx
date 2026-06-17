import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Casa de Leyva",
  description:
    "How Casa de Leyva collects, uses, and protects your information, including text messaging (SMS) and mobile data.",
};

export default function PrivacyPage() {
  return (
    <div className="v8">
      <Header />
      <div className="picado5"></div>
      <section className="legal sec">
        <div className="wrap">
          <div className="lwrap">
            <span className="scr">your privacy matters</span>
            <h1>Privacy Policy</h1>
            <div className="eff">Last updated: June 16, 2026</div>
            <p className="intro">
              Casa de Leyva (&ldquo;Casa de Leyva,&rdquo; &ldquo;we,&rdquo;
              &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates casadeleyva.com and
              the Casa Rewards program. This policy explains what we collect, how
              we use it, and the choices you have. By using our website or joining
              Casa Rewards, you agree to this Privacy Policy.
            </p>

            <h2>Information We Collect</h2>
            <ul>
              <li>
                <b>Information you give us:</b> your name, email address, mobile
                phone number, and birthday when you join Casa Rewards or contact
                us.
              </li>
              <li>
                <b>Program activity:</b> your visits and rewards activity when you
                participate in Casa Rewards.
              </li>
              <li>
                <b>Automatic information:</b> basic usage and device information
                collected through standard web technologies when you visit our
                site.
              </li>
            </ul>

            <h2>How We Use Your Information</h2>
            <ul>
              <li>To operate and administer the Casa Rewards loyalty program.</li>
              <li>
                To send transactional messages and, with your consent, marketing
                messages by email and/or text.
              </li>
              <li>To respond to your questions and provide customer service.</li>
              <li>To improve our website, menu, and services.</li>
              <li>To comply with our legal obligations.</li>
            </ul>

            <h2>Text Messaging (SMS) &amp; Your Mobile Information</h2>
            <p>
              If you opt in, we may send you recurring automated text messages
              about Casa Rewards, promotions, offers, and events. Message and data
              rates may apply, message frequency varies, and you can opt out at any
              time by replying STOP. For full program terms, see our{" "}
              <a href="/terms#sms">SMS Terms</a>.
            </p>
            <div className="callout">
              <p>
                <b>
                  No mobile information will be sold or shared with third parties
                  or affiliates for marketing or promotional purposes.
                </b>{" "}
                Text messaging originator opt-in data and consent are not shared
                with any third parties.
              </p>
            </div>

            <h2>How We Share Information</h2>
            <p>
              We do not sell your personal information. We may share information
              with service providers who help us run our business and the rewards
              program (for example, our customer-relationship and messaging
              providers), and only so they can provide services to us. We may also
              share information when required to comply with the law or to protect
              our rights. As stated above, mobile opt-in and SMS consent
              information is never shared with third parties for their own
              marketing.
            </p>

            <h2>Data Retention &amp; Security</h2>
            <p>
              We keep your information for as long as needed to provide the program
              and for legitimate business or legal purposes, and we use reasonable
              safeguards to help protect it.
            </p>

            <h2>Your Choices</h2>
            <ul>
              <li>
                <b>Email:</b> unsubscribe using the link in any marketing email.
              </li>
              <li>
                <b>Text messages:</b> reply STOP to cancel at any time; reply HELP
                for help.
              </li>
              <li>
                You may contact us to access or delete your information.
              </li>
            </ul>

            <h2>Children&rsquo;s Privacy</h2>
            <p>
              Our website and Casa Rewards are not directed to children under 13,
              and we do not knowingly collect information from them.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes take
              effect when posted on this page.
            </p>

            <h2>Contact Us</h2>
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
