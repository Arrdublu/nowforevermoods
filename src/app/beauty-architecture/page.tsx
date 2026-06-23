"use client";
import React, { useState, useEffect } from "react";
import { Navbar } from "../../components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { motion } from "motion/react";
import { useGeoPricing } from "../../hooks/useGeoPricing";
import { getAuthService, getDb, handleFirestoreError } from "../../lib/firebase";
import { addDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { StripePayment } from "../../components/StripePayment";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { LeadMagnet } from "../../components/LeadMagnet";

const BEAUTY_BASE_PRICE_USD = 100;
const BEAUTY_BASE_PRICE_JMD = 15000;
const UPSHOT_PRICE_USD = 100;
const UPSHOT_PRICE_JMD = 15000;

export default function BeautyArchitecturePage() {
    const { currency, calculateGeoPrice } = useGeoPricing();
    const auth = getAuthService();
    const db = getDb();
    
    const [loading, setLoading] = useState(false);
    const [wantsProShot, setWantsProShot] = useState(false);
    
    // Portfolio logic
    const [portfolioImages, setPortfolioImages] = useState<any[]>([
        { url: "https://picsum.photos/seed/beauty1/600/800", type: "image", id: "fallback-1" },
        { url: "https://picsum.photos/seed/beauty2/600/600", type: "image", id: "fallback-2" },
        { url: "https://picsum.photos/seed/beauty3/600/900", type: "image", id: "fallback-3" },
        { url: "https://picsum.photos/seed/beauty4/600/700", type: "image", id: "fallback-4" },
        { url: "https://picsum.photos/seed/beauty5/600/800", type: "image", id: "fallback-5" },
        { url: "https://picsum.photos/seed/beauty6/600/600", type: "image", id: "fallback-6" }
    ]);
    
    useEffect(() => {
        const q = query(
            collection(db, "portfolio_items"),
            where("theme_category", "==", "Beauty Architecture")
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const images = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    url: typeof data.url === 'string' ? data.url : "",
                    type: typeof data.type === 'string' ? data.type : "image"
                } as any;
            });
            if (images.length > 0) {
                setPortfolioImages(images);
            }
        });
        return () => unsub();
    }, [db]);

    
    // Form fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [date, setDate] = useState("");
    
    // Checkout state
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string>("");
    
    // Sandbox simulation states
    const [stripeKeyMissingError, setStripeKeyMissingError] = useState(false);
    const [simulatedBooking, setSimulatedBooking] = useState<any>(null);

    const handleSimulatedBeautyPaymentSuccess = async () => {
        if (!simulatedBooking) return;
        setLoading(true);
        try {
            const docRefId = simulatedBooking.bookingId;
            const { doc, updateDoc, addDoc } = await import("firebase/firestore");
            
            // Mark booking payment status as paid
            await updateDoc(doc(db, "bookings", docRefId), {
                paymentStatus: "paid",
                status: "confirmed"
            });

            // Create booking confirmation
            const confirmData = {
                bookingId: docRefId,
                userId: simulatedBooking.userId,
                amount: simulatedBooking.amount,
                status: "confirmed",
                confirmedAt: new Date(),
                isSimulated: true
            };
            await addDoc(collection(db, "bookingConfirmations"), confirmData);

            // Redirect to success
            window.location.href = "/booking/success";
        } catch (e) {
            console.error(e);
            alert("Simulation failed, please try again.");
        } finally {
            setLoading(false);
            setStripeKeyMissingError(false);
        }
    };

    // Form Validation Logic
    const isFutureDate = (selectedDate: string) => {
        if (!selectedDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [year, month, day] = selectedDate.split('-').map(Number);
        const selected = new Date(year, month - 1, day);
        return selected > today;
    };

    const isFormValid = name.trim() !== "" && email.trim() !== "" && isFutureDate(date);

    const basePrice = currency === 'JMD' ? BEAUTY_BASE_PRICE_JMD : BEAUTY_BASE_PRICE_USD;
    const upsellPrice = wantsProShot ? (currency === 'JMD' ? UPSHOT_PRICE_JMD : UPSHOT_PRICE_USD) : 0;
    const totalGeoPrice = basePrice + upsellPrice;

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isFormValid) {
            alert("Please complete all fields correctly. Ensure the requested date is in the future.");
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            const finalEmail = user?.email || email;
            if (!finalEmail) {
                alert("Please provide an email.");
                setLoading(false);
                return;
            }

            const docRef = await addDoc(collection(db, "bookings"), {
                userId: user?.uid || "guest",
                userName: name,
                userEmail: finalEmail,
                date: new Date(date).toISOString(),
                packageId: "beauty-architecture",
                packageName: "Standalone Beauty Architecture" + (wantsProShot ? " + Pro-Shot" : ""),
                amountTotal: totalGeoPrice,
                currency: currency.toLowerCase(),
                status: "pending",
                paymentStatus: "pending",
                createdAt: new Date().toISOString()
            });

            setBookingId(docRef.id);
            setUserId(user?.uid || "guest");

            const res = await fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    bookingId: docRef.id, 
                    userId: user?.uid || 'guest'
                })
            });
            
            const data = await res.json();
            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
            } else if (data.stripeKeyMissing) {
                setSimulatedBooking({
                    bookingId: docRef.id,
                    userId: user?.uid || 'guest',
                    amount: Math.round(totalGeoPrice * 100)
                });
                setStripeKeyMissingError(true);
            } else {
                alert("Failed to initiate checkout");
            }

        } catch (error: any) {
            console.error(error?.message || String(error));
            const msg = error.message || "";
            if (msg.includes("Stripe API Key") || msg.includes("STRIPE") || msg.includes("secrets/")) {
                setStripeKeyMissingError(true);
            } else {
                handleFirestoreError(error, "write", "bookings");
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = () => {
        // StripePayment will redirect or we can handle it here if redirect is set to if_required
        window.location.href = "/booking/success";
    };

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-accent/20 flex flex-col">
            <Navbar />
            
            <main className="flex-1 pt-24 pb-16">
                {/* Hero Header: Masonry Grid */}
                <section className="px-4 py-8 max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <motion.h1 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-6xl font-serif text-brand-black tracking-tight"
                        >
                            Beauty Architecture
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-[10px] uppercase font-bold tracking-[0.3em] text-brand-muted mt-4"
                        >
                            Ioka&apos;s Masterclass in Editorial Skin Prep
                        </motion.p>
                    </div>

                    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                        {portfolioImages.map((item, i) => (
                            <motion.div 
                                key={item.id || i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="break-inside-avoid relative"
                            >
                                {item.type === 'video' ? (
                                    <video 
                                        src={item.url} 
                                        autoPlay 
                                        muted 
                                        loop 
                                        playsInline 
                                        className="w-full h-auto object-cover border border-brand-line filter grayscale hover:grayscale-0 transition-all duration-700" 
                                    />
                                ) : (
                                    <Image 
                                        src={item.url || '/hero.jpg'} 
                                        alt={item.title || "Macro beauty shot"} 
                                        width={600} 
                                        height={800} 
                                        className="w-full h-auto object-cover border border-brand-line filter grayscale hover:grayscale-0 transition-all duration-700" 
                                        referrerPolicy="no-referrer"
                                    />
                                )}
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="max-w-3xl mx-auto px-6 py-16">
                    <div className="grid md:grid-cols-2 gap-12 items-start">
                        {/* Package Details */}
                        <div>
                            <h2 className="text-2xl font-serif text-brand-black mb-6">The Standalone Experience</h2>
                            <div className="space-y-4 text-sm text-brand-muted leading-relaxed">
                                <p>
                                    A dedicated session focusing entirely on the art of skin. Perfect for creators, 
                                    models updating their comps, or anyone seeking that distinct, high-fashion glow.
                                </p>
                                <ul className="space-y-2 list-inside text-xs uppercase tracking-widest font-bold mt-6">
                                    <li>+ Full Skin Prep</li>
                                    <li>+ Editorial Makeup Application</li>
                                    <li>+ Private Studio Time</li>
                                    <li>+ &quot;Maintaining the Glow&quot; Mini-Guide</li>
                                </ul>
                                <div className="mt-8 pt-8 border-t border-brand-line">
                                    <p className="text-xl font-light text-brand-black mb-2">
                                        {currency === 'JMD' ? 'J$' : '$'}
                                        {(currency === 'JMD' ? BEAUTY_BASE_PRICE_JMD : BEAUTY_BASE_PRICE_USD).toLocaleString()}
                                    </p>
                                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-muted">
                                        Fixed Rate • Full Payment Required Upfront
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Booking Form or Payment */}
                        <div className="bg-white border border-brand-line p-8">
                            {clientSecret && bookingId ? (
                                <StripePayment
                                    amount={totalGeoPrice * 100}
                                    currency={currency}
                                    bookingId={bookingId}
                                    userId={userId}
                                    onSuccess={handlePaymentSuccess}
                                    prefetchedClientSecret={clientSecret}
                                />
                            ) : (
                                <>
                                    <form onSubmit={handleCheckout} className="space-y-6">
                                        <div>
                                            <Label className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Name</Label>
                                            <Input required value={name} onChange={e => setName(e.target.value)} className="rounded-none border-brand-line mt-2" placeholder="Your full name" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Email</Label>
                                            <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-none border-brand-line mt-2" placeholder="Where we send the prep guide" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Requested Date</Label>
                                            <Input required type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-none border-brand-line mt-2" />
                                        </div>
                                        
                                        <div className="p-4 bg-brand-surface border border-brand-line">
                                            <label className="flex items-start gap-3 cursor-pointer group">
                                                <div className="mt-1 flex items-center justify-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={wantsProShot} 
                                                        onChange={e => setWantsProShot(e.target.checked)}
                                                        className="w-4 h-4 rounded-none border-brand-line text-brand-black focus:ring-brand-black"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold tracking-widest text-brand-black group-hover:text-brand-accent transition-colors">
                                                        Add 15-Minute &quot;Pro-Shot&quot;
                                                    </p>
                                                    <p className="text-xs text-brand-muted mt-1">
                                                        By Arrdublu (+ {currency === 'JMD' ? 'J$' : '$'}{(currency === 'JMD' ? UPSHOT_PRICE_JMD : UPSHOT_PRICE_USD).toLocaleString()}). An easy way to capture your final look with professional gear.
                                                    </p>
                                                </div>
                                            </label>
                                        </div>

                                        <Button 
                                            type="submit" 
                                            disabled={loading || !isFormValid}
                                            className={`w-full h-14 text-[10px] uppercase tracking-widest font-bold transition-all duration-300 rounded-none ${
                                                loading || !isFormValid 
                                                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed hover:bg-zinc-100 disabled:pointer-events-auto disabled:opacity-100" 
                                                : "bg-brand-black text-white hover:bg-zinc-800 active:scale-[0.98] shadow-sm hover:shadow-md"
                                            }`}
                                        >
                                            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                                            {loading ? 'Securing Studio...' : 'Secure Private Studio Time'}
                                        </Button>
                                    </form>
                                    <LeadMagnet />
                                </>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <Dialog open={stripeKeyMissingError} onOpenChange={setStripeKeyMissingError}>
                <DialogContent className="bg-brand-surface border border-brand-line text-brand-text sm:max-w-[550px] rounded-3xl p-0 overflow-hidden shadow-2xl z-[200]">
                    <div className="p-8 border-b border-brand-line bg-brand-surface">
                        <span className="text-[9px] uppercase tracking-[0.4em] text-brand-accent font-bold mb-1 block">Environment Guide</span>
                        <h3 className="font-serif text-2xl text-brand-black italic">Stripe Environment Setup Required</h3>
                        <p className="text-[10px] text-brand-muted uppercase tracking-widest font-semibold mt-1">Stripe Secret API Key is currently missing or invalid.</p>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs space-y-2 text-amber-800">
                            <span className="font-bold flex items-center gap-2"><AlertCircle size={14} /> Live Payments Blocked</span>
                            <p className="leading-relaxed font-semibold font-sans">To activate production-ready card checkouts, you must configure your Stripe credentials in the App Settings.</p>
                        </div>

                        <div className="space-y-3 font-sans">
                            <h4 className="text-[11px] uppercase tracking-widest font-bold text-brand-black">Step-by-Step Instructions:</h4>
                            <ol className="text-xs text-brand-muted space-y-2.5 list-decimal list-inside font-medium leading-relaxed">
                                <li>Open the <span className="text-brand-black font-semibold">Settings</span> panel (gear icon) in the AI Coding agent chat or workspace.</li>
                                <li>Scroll down to the <span className="text-brand-black font-semibold">Environment Secrets / Variables</span> section.</li>
                                <li>Add <strong className="text-brand-black font-semibold">STRIPE_SECRET_KEY</strong> as a secret variable with your Stripe secret key (<code className="font-mono text-amber-600 bg-amber-50/50 px-1 border border-amber-100 rounded">sk_test_...</code>).</li>
                                <li>Add <strong className="text-brand-black font-semibold">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</strong> as a public variable with your Stripe publishable key (<code className="font-mono text-amber-600 bg-amber-50/50 px-1 border border-amber-100 rounded">pk_test_...</code>).</li>
                                <li>Save settings, configure your keys, and click <span className="text-brand-black font-semibold">Restart Dev Server</span>.</li>
                            </ol>
                        </div>

                        <div className="h-px bg-brand-line !my-6" />

                        <div className="space-y-4">
                            <div className="text-center font-sans">
                                <span className="text-[9px] uppercase tracking-widest font-bold text-brand-muted block mb-1">Sandbox Trial Available</span>
                                <p className="text-[11px] text-brand-muted leading-relaxed">You can bypass live Stripe checkouts to fully test booking confirmations, studio log files, and database pipelines.</p>
                            </div>

                            <div className="grid gap-3 pt-2">
                                <Button 
                                    onClick={handleSimulatedBeautyPaymentSuccess}
                                    disabled={loading}
                                    className="bg-brand-black text-white hover:bg-zinc-800 rounded-none h-14 uppercase tracking-widest text-[10px] font-bold shadow-md w-full flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98]"
                                >
                                    {loading ? <Loader2 className="animate-spin w-4 h-4 text-white" /> : "Proceed in Sandbox Simulator Mode"}
                                </Button>
                                
                                <Button 
                                    variant="outline"
                                    onClick={() => setStripeKeyMissingError(false)}
                                    className="rounded-none border-brand-line h-12 uppercase tracking-widest text-[10px] font-bold text-brand-muted hover:text-brand-black hover:bg-brand-bg transition-colors"
                                >
                                    Configure Key Later
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
