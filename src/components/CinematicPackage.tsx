import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Clock, 
  Video, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  MessageSquare,
  Play,
  X,
  Maximize2,
  Film
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Feature {
  label: string;
  provider: 'Arrdublu' | 'Ioka' | 'NowForeverMoods' | string;
}

interface TimelineEvent {
  day?: string;
  events: string[];
}

interface CinematicPackageProps {
  key?: React.Key;
  id?: string;
  title: string;
  description: string;
  type: 'signature' | 'wedding' | 'event' | string;
  price: string;
  features: Feature[];
  credits?: {
    production: string;
    beauty: string;
  };
  media: {
    videoLoop: string;
    fullReel: string;
  };
  timeline?: TimelineEvent[];
  onBook: () => void;
  onConsult?: () => void;
}

export function CinematicPackage({
  title,
  description,
  type,
  price,
  features,
  credits,
  media,
  timeline,
  onBook,
  onConsult
}: CinematicPackageProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const loopRef = useRef<HTMLVideoElement>(null);

  // Play the loop continuously when it's just the card
  useEffect(() => {
    if (loopRef.current && !isFullscreen) {
      loopRef.current.play().catch(() => {});
    }
  }, [isFullscreen]);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="group bg-white border border-brand-line rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col xl:flex-row"
      >
        {/* Media Container */}
        <div 
          className="relative w-full xl:w-2/5 h-[300px] sm:h-[400px] xl:h-[500px] md:h-auto overflow-hidden bg-black cursor-pointer flex flex-col justify-between"
          onClick={() => setIsFullscreen(true)}
        >
          {/* Top Letterbox Bar */}
          <div className="h-12 w-full bg-black z-10 flex items-center px-6 justify-between border-b border-white/10">
            <div className="flex items-center gap-2 text-white/50">
               <Film size={12} />
               <span className="text-[8px] uppercase tracking-[0.4em] font-bold">Arrdublu Motion</span>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 h-3 border border-white/20 rounded-[1px]" />
              ))}
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <video
              ref={loopRef}
              src={media.videoLoop}
              muted
              loop
              playsInline
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 mix-blend-overlay pointer-events-none" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center bg-black/40 backdrop-blur-md group-hover:bg-white group-hover:scale-110 transition-all duration-500">
                <Play className="text-white group-hover:text-brand-black ml-1 transition-colors duration-500" size={24} />
              </div>
            </div>
          </div>

          {/* Bottom Letterbox Bar */}
          <div className="h-12 w-full bg-black z-10 flex items-center px-6 justify-between border-t border-white/10">
             <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 h-3 border border-white/20 rounded-[1px]" />
              ))}
            </div>
            <div className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-300">
               <Maximize2 size={12} />
               <span className="text-[9px] uppercase tracking-widest font-bold">Full Cinematic View</span>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 p-8 md:p-12 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-3xl md:text-4xl font-serif text-brand-black italic mb-2 tracking-tight">{title}</h3>
              <div className="flex flex-col gap-3 mb-6">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-accent italic">{type.charAt(0).toUpperCase() + type.slice(1)} Collection</p>
                
                {/* Expertise Callouts */}
                {credits && (
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline" className="rounded-none border-brand-line bg-brand-surface py-2 px-3 flex items-center gap-2">
                       <Video size={12} className="text-brand-accent" />
                       <span className="text-[9px] uppercase tracking-widest font-bold text-brand-black">Cinematic Direction: {credits.production}</span>
                    </Badge>
                    <Badge variant="outline" className="rounded-none border-brand-line bg-brand-surface py-2 px-3 flex items-center gap-2">
                       <Sparkles size={12} className="text-brand-accent" />
                       <span className="text-[9px] uppercase tracking-widest font-bold text-brand-black">Beauty Architecture: {credits.beauty}</span>
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-muted block mb-1">Starting At</span>
              <span className="text-2xl font-serif text-brand-black">{price}</span>
            </div>
          </div>

          <p className="text-brand-muted text-sm leading-relaxed mb-10 max-w-lg">
            {description}
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 mb-12">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 group/feature">
                <div className="w-5 h-5 rounded-full border border-brand-line flex items-center justify-center text-brand-accent group-hover/feature:bg-brand-accent group-hover/feature:text-white transition-colors duration-300 min-w-5">
                  <Check size={10} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-brand-black tracking-tight">{feature.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Dynamic Wedding Timeline - Horizontal Scroll */}
          {timeline && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="text-brand-accent" size={16} />
                <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-brand-black">Day of Flow</h4>
              </div>
              
              <div className="flex overflow-x-auto pb-6 -mx-8 px-8 md:mx-0 md:px-0 hide-scrollbar snap-x">
                <div className="flex gap-4">
                  {timeline.map((dayLine, i) => (
                    <div key={i} className="flex gap-4">
                       {dayLine.events.map((event, j) => (
                          <div key={j} className="snap-start shrink-0 w-48 sm:w-56 bg-brand-surface border border-brand-line p-6 flex flex-col justify-center">
                            <span className="text-brand-accent text-xl font-serif italic mb-2">0{j + 1}</span>
                            <h5 className="text-[10px] uppercase tracking-widest font-bold text-brand-black">{event}</h5>
                          </div>
                       ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={onBook}
              className="flex-1 bg-brand-black text-white hover:bg-brand-accent hover:scale-[1.02] active:scale-95 active:bg-zinc-800 rounded-full h-14 px-8 uppercase tracking-[0.3em] text-[10px] font-bold shadow-xl group/btn overflow-hidden relative transition-all duration-500"
            >
              <span className="relative z-10">Start Your Journey</span>
              <motion.div 
                className="absolute inset-0 bg-white/10"
                initial={{ x: "-100%" }}
                whileHover={{ x: 0 }}
                transition={{ type: "tween" }}
              />
            </Button>
            
            {type === 'wedding' && (
              <Button 
                variant="outline"
                onClick={onConsult}
                className="px-8 border-brand-line rounded-full h-14 uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-brand-surface transition-colors flex gap-2 items-center shadow-sm"
              >
                <MessageSquare size={14} className="text-brand-accent" />
                Direct Consultation
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Fullscreen Player Overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black bg-opacity-95 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-12"
          >
            <button 
              onClick={() => setIsFullscreen(false)} 
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
            >
              <X size={40} strokeWidth={1} />
            </button>
            <div className="text-center mb-8">
               <h2 className="text-white text-3xl font-serif tracking-widest italic">{title} Reel</h2>
               <p className="text-[10px] uppercase tracking-[0.4em] text-brand-accent font-bold mt-2">Director's Cut</p>
            </div>
            <div className="w-full max-w-5xl aspect-video bg-black relative border border-white/20 shadow-2xl">
              <video 
                src={media.fullReel}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
