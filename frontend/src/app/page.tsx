import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import PhoneSection from "@/components/landing/PhoneSection";
import Features from "@/components/landing/Features";
import CapmarShowcase from "@/components/landing/CapmarShowcase";
import SecurityGrid from "@/components/landing/SecurityGrid";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import InteractiveGrid from "@/components/landing/InteractiveGrid";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center overflow-x-clip">
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
