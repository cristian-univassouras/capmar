import Navbar from "@/app/_landing/layout/Navbar";
import Hero from "@/app/_landing/sections/Hero";
import PhoneSection from "@/app/_landing/sections/PhoneSection";
import Features from "@/app/_landing/sections/Features";
import CapmarShowcase from "@/app/_landing/sections/CapmarShowcase";
import SecurityGrid from "@/app/_landing/sections/SecurityGrid";
import FinalCTA from "@/app/_landing/sections/FinalCTA";
import Footer from "@/app/_landing/layout/Footer";
import InteractiveGrid from "@/app/_landing/components/InteractiveGrid";

export default function Home() {
  return (
    <main className="min-h-screen w-full">
      <Navbar />
      <Hero />
      <PhoneSection>
        <Features />
      </PhoneSection>
      <CapmarShowcase />
      <SecurityGrid />
      <div className="relative w-full bg-background overflow-hidden">
        <InteractiveGrid />
        <FinalCTA />
        <Footer />
      </div>
    </main>
  );
}
