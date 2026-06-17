import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventTierForm from "@/components/forms/EventTierForm";

export const metadata: Metadata = {
  title: "Book The Leyva Grand Collection — Casa de Leyva | Buckeye, AZ",
  description:
    "Book the Leyva Grand Collection at Casa de Leyva in Buckeye — $14,800 all-inclusive for up to 100 guests. Dual service, full open bar, florals, photo booth.",
};

export default function BookingPage() {
  return (
    <div className="v8">
      <Header />
      <EventTierForm tier="leyva-grand" />
      <Footer />
    </div>
  );
}
