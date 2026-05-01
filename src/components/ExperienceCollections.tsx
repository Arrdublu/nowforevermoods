'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGeoPricing, Currency } from '../hooks/useGeoPricing';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { getDb, getAuthService } from '../lib/firebase';
import { Loader2, Plus, ArrowRight, Video, Sparkles, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StripePayment } from './StripePayment';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; 

const PACKAGES = [
  {
    id: 'exp-sig-motion',
    name: 'The Signature Motion',
    type: 'Branding Focus',
    description: 'A polished, high-energy reel designed for social visibility, featuring fluid movement and intentional lighting.',
    usdPrice: 650,
    jmdPrice: 97500,
    features: [
      '60s Cinematic Reel',
      '10 Retouched Images',
      '1.5hr Session'
    ],
    expertiseProviderArr: 'High-frame-rate tracking shots.',
    expertiseProviderIok: '"Power Glam" camera-ready finish.',
    media: {
      poster: 'https://cdn.pixabay.com/photo/2020/02/05/17/20/model-4821616_1280.jpg',
      videoLoop: 'https://cdn.pixabay.com/video/2016/09/21/5361-183437941_tiny.mp4'
    }
  },
  {
    id: 'exp-legacy-film',
    name: 'The Legacy Film',
    type: 'Milestone Focus',
    description: 'For the memories meant to outlive the moment. A narrative-driven "Living Portrait" focusing on emotion, organic audio.',
    usdPrice: 850,
    jmdPrice: 127500,
    features: [
      '3-minute Narrative Storyboarded Film',
      '20 Retouched Images',
      'Half-day Session'
    ],
    expertiseProviderArr: 'Audio-captured narrative & music bed.',
    expertiseProviderIok: 'Multi-look aesthetic transition.',
    media: {
      poster: 'https://cdn.pixabay.com/photo/2018/01/15/07/51/woman-3083379_1280.jpg',
      videoLoop: 'https://cdn.pixabay.com/video/2020/06/15/42045-430932219_tiny.mp4'
    }
  },
  {
    id: 'exp-nuptial-premiere',
    name: 'The Nuptial Premiere',
    type: 'Wedding/Elopement Focus',
    description: 'A full "Wedding Premiere" film. Multi-camera coverage, captured audio of vows, and a cinematic edit that tells the story of the day.',
    usdPrice: 4800,
    jmdPrice: 720000,
    features: [
      '5-7m Feature Film',
      'Highlight Reel',
      'Full-day Coverage',
      'High-res Gallery'
    ],
    expertiseProviderArr: 'Multi-cam cinematic orchestration.',
    expertiseProviderIok: 'Full bridal beauty architecture.',
    media: {
      poster: 'https://cdn.pixabay.com/photo/2021/08/25/20/42/field-6574455_1280.jpg',
      videoLoop: 'https://cdn.pixabay.com/video/2018/10/16/18653-294371587_tiny.mp4'
    }
  }
];

function PackageCard({ pkg, currency, onBook }: { pkg: any, currency: Currency, onBook: (pkg: any) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isHovered && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (!isHovered && videoRef.current) {
      videoRef.current.pause();
      // Optional: videoRef.current.currentTime = 0; // reset to beginning on hover out
    }
  }, [isHovered]);

  const basePrice = currency === 'USD' ? pkg.usdPrice : pkg.jmdPrice;
  const depositAmount = basePrice * 0.50;
  const priceDisplay = currency === 'USD' ? `$${basePrice}` : `J$${basePrice.toLocaleString()}`;
  const depositDisplay = currency === 'USD' ? `$${depositAmount}` : `J$${depositAmount.toLocaleString()}`;

  return (
    <motion.div 
      initial={{ opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-stone-50 border border-stone-200 overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-700"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Media Box */}
      <div className="relative w-full h-[340px] md:h-[400px] overflow-hidden bg-black">
        {/* Poster */}
        <img 
          src={pkg.media.poster} 
          alt={pkg.name} 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isHovered ? 'opacity-0' : 'opacity-100'}`} 
        />
        {/* Video Loop */}
        <video
          ref={videoRef}
          src={pkg.media.videoLoop}
          poster={pkg.media.poster}
          muted
          playsInline
          loop
          preload="none"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-6 left-6 right-6 z-20">
          <Badge variant="outline" className="text-white border-white/40 bg-black/40 mb-3 uppercase tracking-widest text-[9px] backdrop-blur-md rounded-none drop-shadow-md">
            {pkg.type}
          </Badge>
          <h3 className="text-white text-3xl font-serif italic drop-shadow-lg">{pkg.name}</h3>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-8">
        <p className="text-stone-600 text-sm mb-8 leading-relaxed">
          {pkg.description}
        </p>

        <div className="mb-8 flex flex-col gap-2">
          {pkg.features.map((feat: string, i: number) => (
             <div key={i} className="flex items-center gap-3">
               <div className="w-1 h-1 bg-amber-200 rounded-full flex-shrink-0" />
               <span className="text-stone-800 text-xs font-bold uppercase tracking-wide">{feat}</span>
             </div>
          ))}
        </div>

        {/* Collective Signature */}
        <div className="py-6 border-y border-stone-200 mb-8 space-y-4">
          <h4 className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 mb-4">Collective Signature</h4>
          
          <div className="flex flex-col gap-1">
             <span className="text-[10px] uppercase font-bold text-stone-900 tracking-widest flex justify-between">
               <span>Production: Arrdublu</span>
             </span>
             <span className="text-xs text-stone-500 italic">{pkg.expertiseProviderArr}</span>
          </div>
          
          <div className="flex flex-col gap-1 mt-3">
             <span className="text-[10px] uppercase font-bold text-stone-900 tracking-widest flex justify-between">
               <span>Aesthetics: Ioka</span>
             </span>
             <span className="text-xs text-stone-500 italic">{pkg.expertiseProviderIok}</span>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-stone-500 tracking-widest font-bold">Total Investment</span>
            <span className="text-2xl font-serif text-stone-900">{priceDisplay}</span>
            <span className="text-[10px] text-stone-400 tracking-wide mt-1">50% Retainer: <span className="font-bold text-stone-600">{depositDisplay}</span></span>
          </div>
          
          <Button 
            onClick={() => onBook(pkg)}
            className="rounded-none bg-brand-accent hover:bg-brand-black hover:text-white transition-all duration-500 uppercase tracking-[0.3em] text-[9px] h-14 px-8 border border-white/20 shadow-lg hover:shadow-brand-accent/20 active:scale-90 active:bg-zinc-800"
          >
            Book Now
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

import { BookingForm } from './BookingForm';

export function ExperienceCollections() {
  const { currency } = useGeoPricing();
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const handleBook = (pkg: any) => {
    setSelectedPkg(pkg);
    setIsBookingOpen(true);
  };

  return (
    <div className="w-full bg-[#fafaf9] py-32">
      <div className="max-w-7xl mx-auto px-8">
        
        <div className="mb-24 text-center max-w-3xl mx-auto">
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-amber-600 mb-4 block">NowForeverMoods Collections</span>
          <h2 className="text-4xl md:text-6xl font-serif italic text-stone-900 tracking-tight mb-6">Experience Tiers</h2>
          <p className="text-stone-500 uppercase tracking-widest text-xs font-bold leading-relaxed">
            The intersection of high-fashion beauty and cinematic storytelling.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {PACKAGES.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} currency={currency} onBook={handleBook} />
          ))}
        </div>

      </div>

      <BookingForm
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        selectedPackage={selectedPkg}
        currency={currency}
      />
    </div>
  );
}
