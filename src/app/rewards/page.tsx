import type { Metadata } from "next";
import Header from "@/components/Header";
import Rewards from "@/components/Rewards";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Casa Rewards — Casa de Leyva | Buckeye, AZ",
  description:
    "Join Casa Rewards free. Earn a free agua fresca at 3 visits, a free dessert at 5, a free appetizer at 10, a birthday reward, and members-only specials at Casa de Leyva in Buckeye.",
};

export default function RewardsPage() {
  return (
    <div className="v8">
      <Header />
      <Rewards />
      <Footer />
    </div>
  );
}
