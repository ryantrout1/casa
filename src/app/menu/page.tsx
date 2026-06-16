import type { Metadata } from "next";
import Header from "@/components/Header";
import Menu from "@/components/Menu";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Menu — Casa de Leyva | Buckeye, AZ",
  description:
    "The full Casa de Leyva menu — tacos, entrées, parrillada, weekend brunch, caldos, appetizers, desserts, beer and signature cocktails. Buckeye, AZ.",
};

export default function MenuPage() {
  return (
    <div className="v8">
      <Header />
      <Menu />
      <Footer />
    </div>
  );
}
