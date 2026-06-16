import type { Metadata } from "next";
import Header from "@/components/Header";
import Catering from "@/components/Catering";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Events & Catering — Casa de Leyva | Buckeye, AZ",
  description:
    "Private event packages and authentic Mexican catering from Casa de Leyva in Buckeye — weddings, quinceañeras, corporate events, and in-house taco catering.",
};

export default function CateringPage() {
  return (
    <div className="v8">
      <Header />
      <Catering />
      <Footer />
    </div>
  );
}
