import type { Metadata } from "next";
import Header from "@/components/Header";
import AllFiestas from "@/components/AllFiestas";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Fiestas & Events — Casa de Leyva | Buckeye, AZ",
  description:
    "Upcoming fiestas at Casa de Leyva in Buckeye — FIFA watch parties, Lotería nights, Cinco de Mayo, Taco Tuesdays, Fajita Wednesdays and more.",
};

export default function FiestasPage() {
  return (
    <div className="v8">
      <Header />
      <AllFiestas />
      <Footer />
    </div>
  );
}
