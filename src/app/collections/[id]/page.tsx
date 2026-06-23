'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { useGeoPricing } from '@/hooks/useGeoPricing';
import { motion } from 'motion/react';
import { BookingForm } from '@/components/BookingForm';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function PackageDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { currency } = useGeoPricing();
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState<string>('');
  const [depositDisplay, setDepositDisplay] = useState<string>('');

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    const fetchPackage = async () => {
      try {
        const docRef = doc(getDb(), "packages", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPkg({
            id: docSnap.id,
            name: typeof data.name === 'string' ? data.name : "",
            description: typeof data.description === 'string' ? data.description : "",
            type: typeof data.type === 'string' ? data.type : "signature",
            usdPrice: Number(data.usdPrice) || 0,
            jmdPrice: Number(data.jmdPrice) || 0,
            isFeatured: Boolean(data.isFeatured),
            features: Array.isArray(data.features) ? data.features.filter(f => typeof f === 'string') : [],
            media: {
              poster: data.media?.poster || "",
              videoLoop: data.media?.videoLoop || ""
            },
            expertiseProviderArr: typeof data.expertiseProviderArr === 'string' ? data.expertiseProviderArr : "",
            expertiseProviderIok: typeof data.expertiseProviderIok === 'string' ? data.expertiseProviderIok : "",
            credits: {
              production: data.credits?.production || "",
              beauty: data.credits?.beauty || ""
            }
          });
        } else {
          console.error("No such package in Firestore!");
        }
      } catch (error) {
        console.error("Error fetching package:", error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    };
    fetchPackage();
  }, [id]);

  useEffect(() => {
    if (!pkg) return;
    const basePrice = currency === 'USD' ? Number(pkg.usdPrice || 0) : Number(pkg.jmdPrice || 0);
    const depositAmount = basePrice * 0.50;
    setPriceDisplay(currency === 'USD' ? `$${basePrice}` : `J$${basePrice.toLocaleString()}`);
    setDepositDisplay(currency === 'USD' ? `$${depositAmount}` : `J$${depositAmount.toLocaleString()}`);
  }, [currency, pkg]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-900" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf9] space-y-6">
        <h1 className="text-4xl font-serif text-stone-900 italic">Collection not found</h1>
        <Button variant="outline" onClick={() => router.push('/')} className="rounded-none border-stone-200 hover:bg-stone-100 text-xs uppercase tracking-widest font-bold">Return Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] pt-24 pb-32">
      <div className="max-w-6xl mx-auto px-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-stone-400 hover:text-stone-900 transition-colors mb-12 text-[10px] uppercase font-bold tracking-[0.2em]">
          <ArrowLeft size={16} /> Returns
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
          <div className="relative w-full h-[55vh] min-h-[450px] overflow-hidden bg-black shadow-2xl flex items-end">
            {pkg.media?.poster && (
              <Image src={pkg.media.poster} alt={pkg.name} fill className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" sizes="100vw" referrerPolicy="no-referrer" priority />
            )}
            {pkg.media?.videoLoop && (
              <video src={pkg.media.videoLoop} autoPlay muted loop playsInline poster={pkg.media?.poster} className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
            <div className="relative z-10 p-10 md:p-16 w-full max-w-4xl">
              <Badge variant="outline" className="text-white border-white/40 bg-black/40 mb-6 uppercase tracking-[0.3em] text-[10px] backdrop-blur-md rounded-none shadow-md">
                {pkg.type || 'Signature Session'}
              </Badge>
              <h1 className="text-6xl md:text-8xl font-serif italic text-white drop-shadow-2xl mb-6 tracking-tighter">{pkg.name}</h1>
              <p className="text-white/80 text-xl max-w-2xl font-light leading-relaxed drop-shadow-md">
                {pkg.description}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-16">
              <div>
                <h3 className="text-[11px] uppercase tracking-[0.4em] font-bold text-amber-600 mb-8 pb-4 border-b border-stone-200">Included Features</h3>
                <div className="space-y-5">
                  {pkg.features?.map((feat: any, i: number) => {
                    const label = typeof feat === 'object' ? feat.label : feat;
                    return (
                      <div key={i} className="flex items-start gap-4 p-4 bg-white border border-stone-100 shadow-sm transition-all hover:border-amber-200/50 hover:shadow-md">
                        <div className="w-1.5 h-1.5 bg-amber-400 mt-2 flex-shrink-0" />
                        <span className="text-sm text-stone-700 leading-relaxed font-medium">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {(pkg.expertiseProviderArr || pkg.expertiseProviderIok || pkg.credits) && (
                <div>
                  <h3 className="text-[11px] uppercase tracking-[0.4em] font-bold text-stone-400 mb-8 pb-4 border-b border-stone-200">The Collective Signature</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    {(pkg.expertiseProviderArr || pkg.credits?.production) && (
                      <div className="bg-white p-6 border border-stone-100 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-stone-900 tracking-widest block mb-3 border-b-2 border-stone-900 w-fit pb-1">Production: Arrdublu</span>
                        <span className="text-sm text-stone-500 italic leading-relaxed block">{pkg.expertiseProviderArr || pkg.credits?.production}</span>
                      </div>
                    )}
                    {(pkg.expertiseProviderIok || pkg.credits?.beauty) && (
                      <div className="bg-white p-6 border border-stone-100 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-stone-900 tracking-widest block mb-3 border-b-2 border-stone-900 w-fit pb-1">Aesthetics: Ioka</span>
                        <span className="text-sm text-stone-500 italic leading-relaxed block">{pkg.expertiseProviderIok || pkg.credits?.beauty}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8 h-fit lg:sticky lg:top-32 p-10 border border-stone-200 bg-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-full blur-3xl -mx-10 -my-10 opacity-60 pointer-events-none" />
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] uppercase text-stone-400 tracking-widest font-bold block mb-2">Total Investment</span>
                <div className="text-5xl font-serif text-stone-900">{priceDisplay}</div>
              </div>
              <div className="space-y-2 pt-6 border-t border-stone-100 relative z-10">
                <span className="text-[10px] uppercase text-stone-400 tracking-widest font-bold flex justify-between">
                  <span>50% Retainer</span>
                  <span className="text-stone-900">{depositDisplay}</span>
                </span>
                <p className="text-[10px] text-stone-500 italic mt-2 leading-relaxed">Deposit required to secure dates in the production calendar.</p>
              </div>
              <Button 
                onClick={() => setIsBookingOpen(true)}
                className="w-full mt-6 rounded-none bg-stone-900 text-white hover:bg-stone-800 transition-all duration-300 uppercase tracking-[0.4em] text-[10px] h-16 shadow-xl hover:shadow-2xl relative z-10"
              >
                Secure Booking
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <BookingForm
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        selectedPackage={pkg}
        currency={currency}
      />
    </div>
  );
}
