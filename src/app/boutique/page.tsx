"use client";
import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc } from "firebase/firestore";
import { getAuthService, getDb } from "../../lib/firebase";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { useGeoPricing } from "../../hooks/useGeoPricing";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function BoutiquePage() {
    const db = getDb();
    const auth = getAuthService();
    const { currency, calculateGeoPrice } = useGeoPricing();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");
    const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null);
    const [stripeKeyMissingError, setStripeKeyMissingError] = useState(false);
    const [simulatedOrder, setSimulatedOrder] = useState<any>(null);

    const handleSimulatedBoutiquePaymentSuccess = async () => {
        if (!simulatedOrder) return;
        setCheckoutLoadingId(simulatedOrder.productId);
        try {
            const docRefId = simulatedOrder.orderId;
            const { doc, updateDoc } = await import("firebase/firestore");
            await updateDoc(doc(db, "orders", docRefId), {
                status: "paid",
                updatedAt: new Date().toISOString()
            });

            window.location.href = `/boutique/success?session_id=SIMULATED_${docRefId}`;
        } catch (e) {
            console.error(e instanceof Error ? e.message : String(e));
            alert("Simulation failed, please try again.");
        } finally {
            setCheckoutLoadingId(null);
            setStripeKeyMissingError(false);
        }
    };

    useEffect(() => {
        const q = query(collection(db, "products"));
        const unsub = onSnapshot(q, (snap) => {
            setProducts(snap.docs.map(doc => {
              const data = doc.data();
               return {
                 id: doc.id,
                 name: typeof data.name === 'string' ? data.name : "",
                 category: typeof data.category === 'string' ? data.category : "",
                 price: Number(data.price) || 0,
                 currency: typeof data.currency === 'string' ? data.currency : "USD",
                 imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : "",
                 inStock: Number(data.inStock) || 0,
                 isDigital: Boolean(data.isDigital),
                 isActive: Boolean(data.isActive),
                 downloadUrl: typeof data.downloadUrl === 'string' ? data.downloadUrl : ""
               } as any;
            }));
            setLoading(false);
        }, (error) => {
            import("../../lib/firebase").then(({ handleFirestoreError }) => {
                handleFirestoreError(error, "list" as any, "products");
            });
        });
        return () => unsub();
    }, [db]);

    const handleQuickAdd = async (product: any) => {
        setCheckoutLoadingId(product.id);
        try {
            const user = auth.currentUser;
            let userEmail = user?.email || "";
            if (!userEmail) {
                const promptEmail = prompt("Please enter your email for the receipt/digital delivery:");
                if (!promptEmail) {
                    setCheckoutLoadingId(null);
                    return;
                }
                userEmail = promptEmail;
            }

            const geoPrice = calculateGeoPrice(product.price);
            
            const docRef = await addDoc(collection(db, "orders"), {
                userId: user?.uid || "guest",
                userEmail,
                productId: product.id,
                productName: product.name,
                amountTotal: geoPrice,
                currency: currency.toLowerCase(),
                status: "pending",
                createdAt: new Date().toISOString()
            });

            const res = await fetch("/api/create-boutique-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: docRef.id, userId: user?.uid || 'guest' })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else if (data.stripeKeyMissing) {
                setSimulatedOrder({ orderId: docRef.id, productId: product.id });
                setStripeKeyMissingError(true);
            } else {
                alert("Failed to initiate checkout");
            }
        } catch (e: any) {
            console.error(e?.message || String(e));
            const msg = e.message || "";
            if (msg.includes("Stripe API Key") || msg.includes("STRIPE") || msg.includes("secrets/")) {
                setStripeKeyMissingError(true);
            } else {
                alert("Error setting up payment");
            }
        } finally {
            setCheckoutLoadingId(null);
        }
    };

    const displayProducts = filter === "All" ? products : products.filter(p => p.category === filter);

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text font-sans">
            <Navbar />
            <div className="pt-32 px-8 pb-16 max-w-7xl mx-auto">
                <header className="mb-16 text-center">
                    <h1 className="text-4xl md:text-5xl font-serif tracking-tight text-brand-black mb-4">NFM Boutique</h1>
                    <p className="text-xs uppercase tracking-[0.3em] font-bold text-brand-muted">Digital & Physical Collective</p>
                    
                    <div className="flex justify-center gap-4 mt-8 flex-wrap">
                        {["All", "Digital Guides", "Presets", "Physical Legacy"].map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`text-[10px] uppercase tracking-widest font-bold px-4 py-2 border transition-all ${filter === cat ? 'border-brand-black bg-brand-black text-white' : 'border-brand-line text-brand-muted hover:border-brand-black/50 hover:text-brand-black'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-brand-accent h-8 w-8" />
                    </div>
                ) : (
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                        {displayProducts.map(product => (
                            <motion.div 
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="break-inside-avoid bg-white border border-brand-line p-4 hover:shadow-lg transition-all flex flex-col group relative overflow-hidden"
                            >
                                <Link href={`/boutique/${product.id}`}>
                                    <div className="w-full bg-brand-surface aspect-[4/5] relative overflow-hidden mb-6">
                                        {product.imageUrl ? (
                                            <Image src={product.imageUrl} fill alt={product.name} className="object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest text-brand-muted/50 font-bold">No Image</div>
                                        )}
                                    </div>
                                </Link>
                                <div className="space-y-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <Link href={`/boutique/${product.id}`} className="hover:text-brand-accent transition-colors">
                                                <h3 className="font-serif text-2xl text-brand-black leading-tight">{product.name}</h3>
                                            </Link>
                                            <span className="text-sm font-light mt-1">
                                                {currency === 'JMD' ? 'J$' : '$'}
                                                {calculateGeoPrice(product.price).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-accent">
                                            {product.category}
                                            {!product.isDigital && ` • ${product.inStock} In Stock`}
                                        </p>
                                    </div>

                                    {(!product.isDigital && product.inStock <= 0) ? (
                                        <Button disabled className="w-full border-brand-line rounded-none bg-brand-surface text-brand-muted text-[10px] uppercase tracking-widest font-bold">
                                            Out of Stock
                                        </Button>
                                    ) : (
                                        <Button 
                                            onClick={() => handleQuickAdd(product)}
                                            disabled={checkoutLoadingId === product.id}
                                            className="w-full bg-brand-black text-white hover:bg-zinc-800 rounded-none text-[10px] uppercase tracking-widest font-bold transition-all h-12"
                                        >
                                            {checkoutLoadingId === product.id ? <Loader2 className="animate-spin h-4 w-4" /> : 'Quick Add'}
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
                {!loading && displayProducts.length === 0 && (
                    <div className="text-center py-20 text-brand-muted text-[10px] uppercase tracking-widest font-bold">
                        No products available in this category.
                    </div>
                )}
            </div>

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
                                <p className="text-[11px] text-brand-muted leading-relaxed">You can bypass live Stripe checkouts to fully test order status logs, product download flow, and database pipelines.</p>
                            </div>

                            <div className="grid gap-3 pt-2">
                                <Button 
                                    onClick={handleSimulatedBoutiquePaymentSuccess}
                                    disabled={checkoutLoadingId !== null}
                                    className="bg-brand-black text-white hover:bg-zinc-800 rounded-none h-14 uppercase tracking-widest text-[10px] font-bold shadow-md w-full flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98]"
                                >
                                    {checkoutLoadingId !== null ? <Loader2 className="animate-spin w-4 h-4 text-white" /> : "Proceed in Sandbox Simulator Mode"}
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
