'use client';
import { motion } from "motion/react";
import { LazyVideo } from "./LazyVideo";

interface CinematicHeroProps {
  videoUrl: string;
  title: string;
  subtitle: string;
  tagline: string;
}

export function CinematicHero({ videoUrl, title, subtitle, tagline }: CinematicHeroProps) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-brand-black">
      {/* Background Cinematic Video */}
      <LazyVideo
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full opacity-60 grayscale hover:grayscale-0 transition-all duration-1000"
      />
      
      {/* Editorial Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-brand-black/40 px-12 pb-24 flex flex-col justify-end items-start border-b border-brand-line">
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
           className="max-w-4xl"
        >
          <span className="text-[10px] uppercase tracking-[0.6em] text-brand-accent font-bold mb-6 block drop-shadow-lg">{tagline}</span>
          <h1 className="text-5xl md:text-8xl font-serif text-white tracking-tighter leading-[0.9] mb-8 italic">
            {title}
          </h1>
          <div className="flex flex-col md:flex-row md:items-baseline gap-6">
            <p className="text-sm md:text-base text-zinc-300 font-light max-w-md leading-relaxed tracking-tight">
              {subtitle}
            </p>
            <div className="flex-1 h-px bg-brand-accent/30 hidden md:block"></div>
            <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] font-bold text-white/60">
              <span>Arrdublu Production</span>
              <div className="w-1 h-1 rounded-full bg-brand-accent"></div>
              <span>Ioka Artistry</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Viewport Corner Accents */}
      <div className="absolute top-12 right-12 w-16 h-16 border-r border-t border-brand-accent/40 pointer-events-none"></div>
      <div className="absolute bottom-12 left-12 w-16 h-16 border-l border-b border-brand-accent/40 pointer-events-none"></div>
    </div>
  );
}
