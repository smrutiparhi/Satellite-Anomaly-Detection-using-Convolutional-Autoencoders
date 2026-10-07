import Benchmark from "../components/landing/Benchmark";
import DemoShowcase from "../components/landing/DemoShowcase";
import FeaturesBento from "../components/landing/FeaturesBento";
import Footer from "../components/landing/Footer";
import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import Navbar from "../components/landing/Navbar";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050706] text-zinc-50 font-sans">
      <Navbar />
      <main>
        <Hero />
        <DemoShowcase />
        <FeaturesBento />
        <HowItWorks />
        <Benchmark />
      </main>
      <Footer />
    </div>
  );
}
