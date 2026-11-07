import Navbar from "@/components/Navbar";
import SmoothScroll from "@/components/SmoothScroll";
import Hero from "@/components/Hero";
import DashboardPreview from "@/components/DashboardPreview";
import AnimatedWaveDivider from "@/components/AnimatedWaveDivider";
import WordMorph from "@/components/WordMorph";
import EditorialSection from "@/components/EditorialSection";
import DraftCarousel from "@/components/DraftCarousel";
import SecuritySection from "@/components/SecuritySection";
import FaqSection from "@/components/FaqSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b0c10] relative text-white selection:bg-white selection:text-black">
      <SmoothScroll />
      <Navbar />
      <Hero />
      <DashboardPreview />
      <AnimatedWaveDivider />
      <WordMorph />
      <EditorialSection />
      <DraftCarousel />
      <SecuritySection />
      <FaqSection />
      <Footer />
    </main>
  );
}
