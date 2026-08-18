import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SkyBackground } from "@/components/sky/SkyBackground";
import { Reveal } from "@/components/site/Reveal";
import { Hero } from "@/components/sections/Hero";
import { Agents } from "@/components/sections/Agents";
import { Failure } from "@/components/sections/Failure";
import { How } from "@/components/sections/How";
import { Execute } from "@/components/sections/Execute";
import { Adaptation } from "@/components/sections/Adaptation";
import { Boundaries } from "@/components/sections/Boundaries";
import { Cta } from "@/components/sections/Cta";

export default function Home() {
  return (
    <div className="relative isolate">
      <SkyBackground />
      <Reveal />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <Agents />
        <Failure />
        <How />
        <Execute />
        <Adaptation />
        <Boundaries />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
