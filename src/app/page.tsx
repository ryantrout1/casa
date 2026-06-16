import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WeeklySpecials from "@/components/WeeklySpecials";
import About from "@/components/About";
import Fiestas from "@/components/Fiestas";
import Favorites from "@/components/Favorites";
import Reviews from "@/components/Reviews";
import FindUs from "@/components/FindUs";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="v8">
      <Header />
      <Hero />
      <WeeklySpecials />
      <About />
      <Fiestas />
      <Favorites />
      <Reviews />
      <FindUs />
      <Footer />
    </div>
  );
}
