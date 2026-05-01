import * as React from 'react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Calendar, 
  Clock, 
  Camera, 
  Video, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Feature {
  label: string;
  provider: 'Arrdublu' | 'Ioka' | 'NowForeverMoods';
}

interface TimelineEvent {
  day: string;
  events: string[];
}

interface ExperienceCardProps {
  key?: React.Key;
  title: string;
  description: string;
  type: 'signature' | 'wedding' | 'event';
  price: string;
  features: Feature[];
  credits?: {
    production: string;
    beauty: string;
  };
  media: {
    image: string;
    video: string;
  };
  highlightReel?: string;
  showHighlightInitially?: boolean;
  timeline?: TimelineEvent[];
  onBook: () => void;
  onConsult?: () => void;
}

export function ExperienceCard({
  title,
  description,
  type,
  price,
  features,
  credits,
  media,
  highlightReel,
  showHighlightInitially,
  timeline,
  onBook,
  onConsult
}: ExperienceCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const highlightRef = useRef<HTMLVideoElement>(null);

  const handleHover = (hovering: boolean) => {
    setIsHovered(hovering);
    if (videoRef.current) {
      if (hovering) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="group bg-white border border-brand-line rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 flex flex-col md:flex-row"
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
    >
      {/* Media Container */}
      <div className="relative w-full md:w-2/5 h-[400px] md:h-auto overflow-hidden bg-brand-black">
        <AnimatePresence mode="wait">
          {showHighlightInitially && highlightReel && !isHovered ? (
            <motion.video
              key="highlight"
              ref={highlightRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={highlightReel}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : !isHovered ? (
            <motion.img
              key="image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={media.image}
              alt={title}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
          ) : (
            <motion.video
              key="video"
              ref={videoRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={media.video}
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          )}
        </AnimatePresence>

        {/* Overlay Badges */}
        <div className="absolute top-6 left-6 flex flex-col gap-2">
          <Badge className="bg-brand-black/80 backdrop-blur-md text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-none border-brand-line border font-bold">
            {type}
          </Badge>
          {showHighlightInitially && highlightReel && !isHovered && (
             <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-[9px] uppercase text-white font-bold tracking-widest bg-brand-accent/90 px-3 py-1"
            >
              <Video size={10} /> 60s Highlight Reel
            </motion.div>
          )}
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-[9px] uppercase text-white font-bold tracking-widest bg-brand-accent/90 px-3 py-1"
            >
              <Video size={10} /> Cinematic Loop
            </motion.div>
          )}
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 p-8 md:p-12 flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-3xl md:text-4xl font-serif text-brand-black italic mb-2 tracking-tight">{title}</h3>
            <div className="flex flex-col gap-1 mb-6">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-accent italic">Signature Collection</p>
              {credits && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[8px] uppercase tracking-[0.2em] font-bold text-brand-muted opacity-80">
                  <span className="flex items-center gap-1">
                    <Video size={8} /> Cinematic Direction: {credits.production}
                  </span>
                  <span className="flex items-center gap-1 border-l border-brand-line pl-4">
                    <Sparkles size={8} /> Beauty Architecture: {credits.beauty}
                  </span>
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
              <div className="w-5 h-5 rounded-full border border-brand-line flex items-center justify-center text-brand-accent group-hover/feature:bg-brand-accent group-hover/feature:text-white transition-colors duration-300">
                <Check size={10} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-brand-black tracking-tight">{feature.label}</span>
                <span className="text-[8px] uppercase tracking-widest text-brand-muted font-bold opacity-60">Via {feature.provider}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Slider for Wedding/Events */}
        {type === 'wedding' && timeline && (
          <div className="mb-12 p-8 bg-brand-surface border border-brand-line">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Clock className="text-brand-accent" size={16} />
                <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-brand-black">Multi-Day Itinerary</h4>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveDay(prev => Math.max(0, prev - 1))}
                  className="p-1 hover:text-brand-accent transition-colors disabled:opacity-30"
                  disabled={activeDay === 0}
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setActiveDay(prev => Math.min(timeline.length - 1, prev + 1))}
                  className="p-1 hover:text-brand-accent transition-colors disabled:opacity-30"
                  disabled={activeDay === timeline.length - 1}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeDay}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="flex items-baseline gap-4">
                  <span className="text-3xl font-serif italic text-brand-accent">{timeline[activeDay].day.split(' ')[1]}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-muted">{timeline[activeDay].day.split(' ')[0]}</span>
                </div>
                <ul className="space-y-2">
                  {timeline[activeDay].events.map((event, i) => (
                    <li key={i} className="text-xs text-brand-muted flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-brand-accent"></div>
                      {event}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={onBook}
            className="flex-1 bg-brand-black text-white hover:bg-zinc-800 rounded-full h-14 uppercase tracking-[0.3em] text-[10px] font-bold shadow-lg group/btn overflow-hidden relative"
          >
            <span className="relative z-10">Secure Collection</span>
            <motion.div 
              className="absolute inset-0 bg-brand-accent"
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
  );
}
