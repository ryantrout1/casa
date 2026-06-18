import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hola from "@/components/Hola";

export const metadata: Metadata = {
  title: "Check In — Casa Rewards | Casa de Leyva",
  description: "Check in to Casa Rewards at Casa de Leyva.",
  robots: { index: false, follow: false },
};

export default function HolaPage() {
  return (
    <div className="v8">
      <Header />
      <Hola />
      <Footer />
    </div>
  );
}
