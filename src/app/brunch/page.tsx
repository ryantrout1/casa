import type { Metadata } from "next";
import Header from "@/components/Header";
import Brunch from "@/components/Brunch";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Weekend Brunch — Casa de Leyva | Buckeye, AZ",
  description:
    "Weekend brunch at Casa de Leyva in Buckeye — chilaquiles, French toast, breakfast burritos, menudo and pozole. Served Saturday 10 AM–1 PM and all day Sunday, with Bloody Marias and mimosas.",
};

export default function BrunchPage() {
  return (
    <div className="v8">
      <Header />
      <Brunch />
      <Footer />
    </div>
  );
}
