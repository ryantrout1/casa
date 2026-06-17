import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EventTierForm from "@/components/forms/EventTierForm";

export const metadata: Metadata = {
  title: "Book The Social Collection — Casa de Leyva | Buckeye, AZ",
  description:
    "Book the Social Collection at Casa de Leyva in Buckeye — $5,500 all-inclusive for up to 100 guests. Grazing table, cash bar, 4-hour private use.",
};

export default function BookingPage() {
  return (
    <div className="v8">
      <Header />
      <EventTierForm tier="social" />
      <Footer />
    </div>
  );
}
