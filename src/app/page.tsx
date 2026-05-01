import { CinematicHero } from "@/components/CinematicHero";
import { Portfolio } from "@/components/Portfolio";
import { ExperienceCollections } from "@/components/ExperienceCollections";
import { Suspense } from "react";

export default function Page() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
        <Suspense fallback={<div className="text-white p-24">Loading...</div>}>
            <CinematicHero 
              videoUrl="https://cdn.pixabay.com/video/2016/09/21/5361-183437941_tiny.mp4" 
              title="Visual Legacy Captured."
              subtitle="A high-fidelity fusion of editorial cinematography and professional makeup artistry. Defining the moods of modern luxury across the Caribbean and beyond."
              tagline="NowForeverMoods Collective"
            />
        </Suspense>
        {/* Portfolio Section */}
        <div className="w-full bg-brand-bg relative pb-32">
          <div className="max-w-7xl mx-auto px-8 md:px-12 pt-16">
            <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <span className="text-[10px] uppercase tracking-[0.6em] text-brand-accent font-bold mb-4 block">Archive 24/25</span>
                <h2 className="text-5xl md:text-7xl font-serif text-brand-black tracking-tighter italic">The Portfolio</h2>
              </div>
              <p className="text-brand-muted text-[11px] uppercase tracking-[0.2em] font-bold max-w-xs leading-relaxed italic">
                Curated architectural moments and cinematic transformations by Arrdublu & Ioka.
              </p>
            </div>
            <Suspense fallback={<div className="text-white p-24">Loading portfolio...</div>}>
                <Portfolio />
            </Suspense>
          </div>
        </div>

        {/* Collections Section */}
        {/* Deployment trigger: 2026-05-01T14:04:00Z */}
        <Suspense fallback={<div className="text-white p-24">Loading collections...</div>}>
          <ExperienceCollections />
        </Suspense>
      </div>
  );
}
