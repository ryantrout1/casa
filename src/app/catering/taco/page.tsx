import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TacoCateringForm from "@/components/forms/TacoCateringForm";

export const metadata: Metadata = {
  title: "Book In-House Taco Catering — Casa de Leyva | Buckeye, AZ",
  description:
    "Request in-house taco catering from Casa de Leyva in Buckeye — $18 per person for groups of 20–40 in our dedicated space. Pick your proteins, bar service, and date.",
};

export default function TacoCateringBookingPage() {
  return (
    <div className="v8">
      <Header />
      <section className="bk-hero sec">
        <div className="wrap">
          <div className="scr">reserva tu fiesta</div>
          <h1 className="pop">
            <span style={{ color: "var(--navy)" }}>BOOK YOUR</span>{" "}
            <span style={{ color: "var(--mag)" }}>TACO CATERING</span>
          </h1>
          <p>
            $18 per person · 20–40 guests · 3-hour private slot. Tell us about
            your event and we&apos;ll call to confirm your date and deposit.
          </p>
        </div>
      </section>
      <section className="bk-formwrap sec">
        <div className="wrap">
          <TacoCateringForm />
        </div>
      </section>
      <Footer />
    </div>
  );
}
