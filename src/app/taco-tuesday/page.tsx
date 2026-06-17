import type { Metadata } from "next";
import Header from "@/components/Header";
import TacoTuesday from "@/components/TacoTuesday";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Taco Tuesday — Casa de Leyva | Buckeye, AZ",
  description:
    "All-you-can-eat tacos every Tuesday at Casa de Leyva in Buckeye — build your own, your way for $19.99, served 4–8 PM. $5 margaritas, $3 draft beers, and a full salsa bar.",
};

export default function TacoTuesdayPage() {
  return (
    <div className="v8">
      <Header />
      <TacoTuesday />
      <Footer />
    </div>
  );
}
