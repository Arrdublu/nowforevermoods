"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { getDb, getAuthService } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { StripePayment } from "@/components/StripePayment";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";

export default function BalancePage() {
  const [clientName, setClientName] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeAmount, setActiveAmount] = useState(0);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getAuthService();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !amount) return;
    
    setLoading(true);
    try {
      const db = getDb();
      const numAmount = parseFloat(amount);
      
      if (isNaN(numAmount) || numAmount <= 0) {
        alert("Please enter a valid amount greater than 0.");
        setLoading(false);
        return;
      }

      const bookingRef = await addDoc(collection(db, "bookings"), {
        userId: user?.uid || "guest",
        userName: clientName,
        packageId: "custom_balance",
        packageName: `Custom Balance: ${reference || 'No Ref'}`,
        amountTotal: numAmount,
        currency: "usd",
        status: "payment_pending",
        date: new Date().toISOString(),
        createdAt: serverTimestamp()
      });

      setActiveAmount(numAmount * 100); // Stripe uses cents
      setActiveBookingId(bookingRef.id);
      setIsPaymentOpen(true);
    } catch (err: any) {
      console.error(err?.message || err);
      alert("Failed to initialize secure terminal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    // You can redirect to success page or show a success message right here
    window.location.href = '/booking/success';
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text pt-24 pb-12 flex flex-col items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-lg bg-white shadow-xl p-8 md:p-12"
      >
        {!isPaymentOpen ? (
          <>
            <div className="text-center mb-10">
              <h1 className="font-serif text-3xl md:text-4xl text-brand-black mb-3 italic">Custom Balance</h1>
              <p className="text-brand-muted text-xs uppercase tracking-widest font-bold leading-relaxed line-clamp-3">
                Securely clear your remaining balance for your curated experience, custom packages, or added transport.
              </p>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">Client Name</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter your full name"
                  className="rounded-none border-brand-line bg-transparent h-12 text-sm focus:border-brand-black"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference" className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">Invoice / Reference Number</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. INV-1002"
                  className="rounded-none border-brand-line bg-transparent h-12 text-sm focus:border-brand-black"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">Amount to Pay (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="rounded-none border-brand-line bg-transparent h-12 text-sm focus:border-brand-black"
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand-black text-white hover:bg-zinc-800 rounded-none h-14 uppercase tracking-widest text-[10px] font-bold mt-4"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Securely Pay Balance
              </Button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center mb-6">
              <button 
                onClick={() => setIsPaymentOpen(false)}
                className="text-brand-muted hover:text-brand-black transition-colors flex items-center text-xs uppercase tracking-widest font-bold"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to details
              </button>
            </div>
            
            <div className="text-center mb-8">
              <h3 className="font-serif text-2xl text-brand-black italic">Secure Terminal</h3>
              <p className="text-brand-muted text-[10px] uppercase tracking-[0.2em] font-bold mt-2">Vaulting Encrypted Transmission</p>
            </div>

            {activeBookingId && (
              <StripePayment 
                amount={activeAmount} 
                currency="usd" 
                bookingId={activeBookingId} 
                userId={user?.uid || "guest"}
                onSuccess={handlePaymentSuccess} 
              />
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
