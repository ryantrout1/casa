import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventTierForm from "@/components/forms/EventTierForm";

export const metadata: Metadata = {
  title: "Book The Tradición Collection — Casa de Leyva | Buckeye, AZ",
  description:
    "Book the Tradición Collection at Casa de Leyva in Buckeye — $9,200 all-inclusive for up to 100 guests. Buffet, hosted beer bar, DJ, 6-hour private use.",
};

export default function BookingPage() {
  return (
    <div className="v8">
      <Header />
      <EventTierForm tier="tradicion" />
      <Footer />
    </div>
  );
}
