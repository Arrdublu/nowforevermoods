"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Navbar } from "../../../components/Navbar";
import { Button } from "@/components/ui/button";
import { useGeoPricing } from "../../../hooks/useGeoPricing";
import { getAuthService, getDb } from "../../../lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function BoutiqueClientDetail({ product }: { product: any }) {
    const { currency, calculateGeoPrice } = useGeoPricing();
    const auth = getAuthService();
    const db = getDb();
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [stripeKeyMissingError, setStripeKeyMissingError] = useState(false);
    const [simulatedOrder, setSimulatedOrder] = useState<any>(null);

    const handleSimulatedBoutiquePaymentSuccess = async () => {
        if (!simulatedOrder) return;
        setCheckoutLoading(true);
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
            setCheckoutLoading(false);
            setStripeKeyMissingError(false);
        }
    };

    const handleCheckout = async () => {
        setCheckoutLoading(true);
        try {
            const user = auth.currentUser;
            let userEmail = user?.email || "";
            if (!userEmail) {
                const promptEmail = prompt("Please enter your email for the receipt/digital delivery:");
                if (!promptEmail) {
                    setCheckoutLoading(false);
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
            setCheckoutLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-accent/20">
            <Navbar />
            <div className="pt-32 px-8 pb-32 max-w-7xl mx-auto">
                <Link href="/boutique" className="inline-flex items-center text-[10px] uppercase font-bold tracking-widest text-brand-muted hover:text-brand-black transition-colors mb-12">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Boutique
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="w-full bg-brand-surface aspect-[4/5] relative border border-brand-line">
                            {product.imageUrl ? (
                                <Image src={product.imageUrl} fill alt={product.name} className="object-cover" referrerPolicy="no-referrer" priority />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest text-brand-muted/50 font-bold">No Image Available</div>
                            )}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col justify-center">
                        <div className="mb-8">
                            <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-brand-accent mb-4 block">
                                {product.category}
                            </span>
                            <h1 className="text-4xl md:text-5xl font-serif text-brand-black mb-4 leading-tight">{product.name}</h1>
                            <div className="text-2xl font-light text-brand-black">
                                {currency === 'JMD' ? 'J$' : '$'}
                                {calculateGeoPrice(product.price).toLocaleString()}
                            </div>
                        </div>

                        <div className="prose prose-sm md:prose-base text-brand-muted mb-12">
                            {product.description ? (
                                <p className="leading-relaxed">{product.description}</p>
                            ) : (
                                <p className="italic">No description provided.</p>
                            )}
                        </div>

                        <div className="space-y-6 pt-8 border-t border-brand-line">
                            <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-brand-muted">
                                <span>Format: {product.isDigital ? 'Digital Download' : 'Physical Item'}</span>
                                {!product.isDigital && <span>•</span>}
                                {!product.isDigital && <span>Stock: {product.inStock}</span>}
                            </div>

                            {(!product.isDigital && product.inStock <= 0) ? (
                                <Button disabled className="w-full h-14 border border-brand-line rounded-none bg-brand-surface text-brand-muted text-[10px] uppercase tracking-widest font-bold">
                                    Currently Out of Stock
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleCheckout}
                                    disabled={checkoutLoading}
                                    className="w-full h-14 bg-brand-black hover:bg-zinc-800 text-white rounded-none text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center"
                                >
                                    {checkoutLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                                    {checkoutLoading ? 'Preparing Secured Checkout...' : 'Purchase Now'}
                                </Button>
                            )}
                            
                            <p className="text-center text-[9px] uppercase tracking-widest font-bold text-brand-muted/70 mt-4">
                                Secure Transact via Stripe
                            </p>
                        </div>
                    </motion.div>
                </div>
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
                                    disabled={checkoutLoading}
                                    className="bg-brand-black text-white hover:bg-zinc-800 rounded-none h-14 uppercase tracking-widest text-[10px] font-bold shadow-md w-full flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98]"
                                >
                                    {checkoutLoading ? <Loader2 className="animate-spin w-4 h-4 text-white" /> : "Proceed in Sandbox Simulator Mode"}
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
