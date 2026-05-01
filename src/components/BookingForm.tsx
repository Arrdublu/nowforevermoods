import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getDb, getAuthService, handleFirestoreError } from "../lib/firebase";
import { Currency } from "../hooks/useGeoPricing";
import { StripePayment } from "./StripePayment";

import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const bookingSchema = z.object({
  email: z.string().email("A valid email is required.").optional().or(z.literal("")),
  fullName: z.string().min(2, "Full name is required.").optional().or(z.literal("")),
  date: z.date({
    message: "A session date is required.",
  }),
  notes: z.string().min(5, {
    message: "Session notes must be at least 5 characters.",
  }).max(500, {
    message: "Notes must not exceed 500 characters.",
  }),
  paymentMode: z.enum(["full", "deposit"]),
  needsBeautyConsult: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // We check for auth status inside the component, but we can't easily access it here.
  // Instead, we will handle the conditional validation in the onConfirm handler
  // or just make them required in the schema and populate them if logged in.
});

type BookingValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: any;
  currency: Currency;
}

export function BookingForm({ isOpen, onClose, selectedPackage, currency }: BookingFormProps) {
  const db = getDb();
  const auth = getAuthService();
  const [loading, setLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<{ id: string, amount: number, clientSecret?: string } | null>(null);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    const fetchBookedDates = async () => {
      try {
        const q = query(
          collection(db, "availability"),
          where("status", "in", ["confirmed", "pending"])
        );
        const snapshot = await getDocs(q);
        const dates: Date[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            dates.push(startOfDay(new Date(data.date)));
          }
        });
        if (isMounted) setBookedDates(dates);
      } catch (err) {
        console.error("Failed to fetch booked dates", err);
        // Only throw if missing permissions, otherwise just log
        if (err instanceof Error && err.message.includes('permission')) {
          handleFirestoreError(err, 'list', 'availability');
        }
      }
    };
    
    fetchBookedDates();
    return () => { isMounted = false; };
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      paymentMode: "full",
      notes: "",
    },
  });

  const date = watch("date");
  const paymentMode = watch("paymentMode");
  const notes = watch("notes");
  const needsBeautyConsult = watch("needsBeautyConsult");

  const handleBooking = async (values: BookingValues) => {
    if (!selectedPackage) return;
    
    // Manual validation for guests
    if (!auth.currentUser) {
      if (!values.fullName || values.fullName.length < 2) {
        alert("System Error: Identity data required for guest checkout.");
        return;
      }
      if (!values.email || !/^\S+@\S+\.\S+$/.test(values.email)) {
        alert("System Error: Valid email required for guest checkout.");
        return;
      }
    }

    setLoading(true);
    try {
      let currentUser = auth.currentUser;
      
      // If no user, try to sign in anonymously to keep track of the booking session
      if (!currentUser) {
        try {
          const { signInAnonymously } = await import("firebase/auth");
          const userCred = await signInAnonymously(auth);
          currentUser = userCred.user;
        } catch (authErr: any) {
          console.warn("Anonymous sign-in failed or restricted, proceeding as guest:", authErr.message);
        }
      }

      const basePrice = currency === 'USD' ? selectedPackage.usdPrice : selectedPackage.jmdPrice;
      const finalAmount = values.paymentMode === 'deposit' ? basePrice * 0.5 : basePrice;

      const bookingData = {
        userId: currentUser?.uid || "guest",
        userEmail: currentUser?.email || values.email || "",
        userName: currentUser?.displayName || values.fullName || "",
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        date: values.date.toISOString(),
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMode: values.paymentMode,
        needsBeautyConsult: values.needsBeautyConsult || false,
        notes: values.notes,
        currency,
        amountTotal: finalAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
        isGuest: !currentUser?.email,
      };

      let docRef;
      try {
        docRef = await addDoc(collection(db, "bookings"), bookingData);
      } catch (err) {
        handleFirestoreError(err, 'create', 'bookings');
      }
      
      try {
        await addDoc(collection(db, "availability"), {
          date: values.date.toISOString(),
          status: 'pending'
        });
      } catch (err) {
        handleFirestoreError(err, 'create', 'availability');
      }
      
      // Pre-fetch Payment Intent for frictionless transition
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            bookingId: docRef.id, 
            userId: bookingData.userId 
          }),
        });
        const data = await response.json();
        
        if (data.clientSecret) {
          setActiveBooking({
            id: docRef.id,
            amount: Math.round(finalAmount * 100),
            clientSecret: data.clientSecret
          });
          setIsPaymentOpen(true);
        } else {
          throw new Error(data.error || "Payment terminal initialization failed");
        }
      } catch (payErr: any) {
        console.error("Payment Intent Error:", payErr);
        alert(`Friction Detected: ${payErr.message}`);
      }

      // Email queue (fire and forget)
      try {
        const targetEmail = currentUser?.email || values.email;
        if (targetEmail) {
          addDoc(collection(db, "mail"), {
            to: [targetEmail, 'hi@arrdublu.us'],
            message: {
              subject: `Session Request Received: ${selectedPackage.name} | NowForeverMoods`,
              text: `Dear ${bookingData.userName || 'Client'},\n\nYour session request for the ${selectedPackage.name} on ${format(values.date, 'PPP')} has been received.`,
              html: `<div style="font-family: sans-serif; padding: 40px; background: #000; color: #fff;"><h1>NOWFOREVERMOODS</h1><p>Session request received for ${selectedPackage.name}.</p></div>`
            }
          });
        }
      } catch (e) {}

    } catch (error) {
      console.error("Booking error:", error);
      alert("System failure. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    reset();
    setIsConfirming(false);
    onClose();
  };

  const onConfirm = (values: BookingValues) => {
    // Manual validation for guests
    if (!auth.currentUser) {
      if (!values.fullName || values.fullName.length < 2) {
        alert("System Error: Identity data required for guest checkout.");
        return;
      }
      if (!values.email || !/^\S+@\S+\.\S+$/.test(values.email)) {
        alert("System Error: Valid email required for guest checkout.");
        return;
      }
    }
    setIsConfirming(true);
  };

  const executeGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        alert("The authentication popup was blocked. Please pop this preview out into a new tab.");
      } else {
        alert(`Sign in error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={closeAndReset}>
        <DialogContent className="bg-brand-surface border-brand-line text-brand-text sm:max-w-[425px] rounded-3xl p-0 overflow-y-auto max-h-[90vh] shadow-2xl">
          <DialogHeader className="p-10 bg-brand-surface border-b border-brand-line">
            <DialogTitle className="font-serif font-light text-3xl text-brand-black">Confirm Reservation</DialogTitle>
            <DialogDescription className="text-brand-muted uppercase text-[10px] font-bold tracking-[0.2em] mt-2">
              {selectedPackage?.name} — {currency === 'USD' ? `$${selectedPackage?.usdPrice}` : `J$${selectedPackage?.jmdPrice?.toLocaleString()}`}
            </DialogDescription>
          </DialogHeader>
          
          <form className="grid gap-8 p-10" onSubmit={handleSubmit(handleBooking)}>
            {!auth.currentUser && (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 p-6 bg-brand-bg/50 border border-brand-line">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-muted mb-2">Guest Identity Portfolio</p>
                  
                  <div className="grid gap-2">
                    <Label className="text-[9px] uppercase tracking-[0.2em] font-bold text-brand-accent">Full Name</Label>
                    <Input 
                      {...register("fullName")}
                      placeholder="Winston Green"
                      className="bg-brand-surface border-brand-line rounded-none h-10 text-xs font-medium"
                    />
                    {errors.fullName && <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest">{errors.fullName.message}</span>}
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[9px] uppercase tracking-[0.2em] font-bold text-brand-accent">Email Address</Label>
                    <Input 
                      {...register("email")}
                      type="email"
                      placeholder="winston@concierge.com"
                      className="bg-brand-surface border-brand-line rounded-none h-10 text-xs font-medium"
                    />
                    {errors.email && <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest">{errors.email.message}</span>}
                  </div>

                  <div className="flex items-center gap-4 py-4">
                    <div className="h-px bg-brand-line flex-1" />
                    <span className="text-[8px] font-bold text-brand-muted tracking-[0.3em] uppercase">or faster access</span>
                    <div className="h-px bg-brand-line flex-1" />
                  </div>

                  <Button 
                    type="button"
                    variant="outline"
                    onClick={executeGoogleLogin}
                    className="rounded-none h-10 uppercase tracking-widest text-[9px] font-bold border-brand-line hover:bg-brand-surface transition-colors"
                  >
                    Sync Google Account
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-3">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-accent">Select Date</Label>
                {errors.date && (
                  <span className="flex items-center text-[10px] text-red-500 font-bold uppercase tracking-widest gap-1 animate-pulse">
                    <AlertCircle size={10} /> {errors.date.message || "Required"}
                  </span>
                )}
                {!errors.date && date && (
                   <span className="flex items-center text-[10px] text-emerald-500 font-bold uppercase tracking-widest gap-1">
                    <CheckCircle2 size={10} /> Verified: {format(date, "PPP")}
                  </span>
                )}
              </div>
              <div className={`p-4 border bg-brand-surface flex justify-center ${errors.date ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]" : "border-brand-line"}`}>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => setValue("date", d as Date, { shouldValidate: true })}
                  disabled={(d) => 
                    d < startOfDay(new Date()) || 
                    bookedDates.some(booked => booked.getTime() === startOfDay(d).getTime())
                  }
                  className="bg-transparent text-brand-text"
                />
              </div>
            </div>

              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-accent">Payment Allocation</Label>
                </div>
                <div className="grid grid-cols-2 gap-px bg-brand-line border border-brand-line">
                  <button 
                    type="button"
                    onClick={() => setValue("paymentMode", "full", { shouldValidate: true })}
                    className={`py-4 text-[10px] uppercase font-bold tracking-widest transition-colors ${paymentMode === 'full' ? 'bg-brand-black text-white' : 'bg-brand-bg text-brand-muted hover:bg-brand-surface'}`}
                  >
                    Full Session
                  </button>
                  <button 
                    type="button"
                    onClick={() => setValue("paymentMode", "deposit", { shouldValidate: true })}
                    className={`py-4 text-[10px] uppercase font-bold tracking-widest transition-colors ${paymentMode === 'deposit' ? 'bg-brand-black text-white' : 'bg-brand-bg text-brand-muted hover:bg-brand-surface'}`}
                  >
                    50% Retainer
                  </button>
                </div>
              </div>
              
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-accent">Notes / Session Details</Label>
                  <div className="flex items-center gap-3">
                    {errors.notes ? (
                      <span className="flex items-center text-[10px] text-red-500 font-bold uppercase tracking-widest gap-1 animate-pulse">
                        <AlertCircle size={10} /> {errors.notes.message}
                      </span>
                    ) : notes && notes.length >= 5 ? (
                       <span className="flex items-center text-[10px] text-emerald-500 font-bold uppercase tracking-widest gap-1">
                        <CheckCircle2 size={10} /> Valid
                      </span>
                    ) : null}
                    <span className={`text-[10px] font-bold tracking-widest ${notes?.length > 450 ? 'text-amber-500' : notes?.length === 500 ? 'text-red-500' : 'text-brand-muted'}`}>
                      {notes?.length || 0} / 500
                    </span>
                  </div>
                </div>
                <textarea 
                  {...register("notes")}
                  className={`bg-brand-bg border-brand-line rounded-none min-h-[100px] p-4 focus-visible:outline-none focus-visible:ring-1 text-sm font-medium resize-y ${errors.notes ? "border-red-500 ring-1 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]" : "focus-visible:ring-brand-accent focus-visible:border-brand-accent"}`} 
                  placeholder="Preferred location, specific requirements..."
                  maxLength={500}
                />
              </div>

              {selectedPackage?.type?.toLowerCase()?.includes('wedding') && (
                <div className="grid gap-4 p-6 bg-brand-surface border border-brand-line">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <Label className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-black">Beauty Consultation & Party Prep</Label>
                      <span className="text-[8px] text-brand-muted uppercase tracking-widest font-bold mt-1">Do you require beauty prep for multiple people? (Bridal Party via Ioka)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setValue("needsBeautyConsult", !needsBeautyConsult, { shouldValidate: true })}
                      className={`w-12 h-6 rounded-full relative transition-colors duration-300 flex-shrink-0 ${needsBeautyConsult ? 'bg-brand-accent' : 'bg-brand-line'}`}
                    >
                      <motion.div 
                        animate={{ x: needsBeautyConsult ? 24 : 2 }}
                        initial={false}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                  {needsBeautyConsult && (
                    <p className="text-[9px] text-brand-muted leading-relaxed italic border-t border-brand-line/50 pt-3">
                      A specialist from the **Ioka Bureau** will contact you within 24 hours to review your bridal party headcount and align your trial date with the **Arrdublu Production** calendar.
                    </p>
                  )}
                </div>
              )}

              <Button 
                type="submit"
                className="bg-brand-black text-white hover:bg-zinc-800 rounded-none h-16 mt-4 uppercase tracking-[0.4em] text-[10px] font-bold shadow-lg"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : "Secure Booking"}
              </Button>
            </form>
        </DialogContent>
      </Dialog>

      {/* Deleted Confirmation Dialog as per frictionless request */}

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="bg-brand-surface border-brand-line text-brand-text sm:max-w-[500px] rounded-3xl p-0 overflow-y-auto max-h-[90vh] shadow-2xl z-[150]">
          <div className="p-10 bg-brand-surface border-b border-brand-line">
            <h3 className="font-serif text-2xl text-brand-black italic">Secure Terminal</h3>
            <p className="text-brand-muted text-[10px] uppercase tracking-[0.2em] font-bold mt-2">Vaulting Encrypted Transmission</p>
          </div>
          <div className="p-10">
            {activeBooking && (
              <StripePayment 
                amount={activeBooking.amount} 
                currency={currency} 
                bookingId={activeBooking.id} 
                userId={auth.currentUser?.uid || 'guest'}
                prefetchedClientSecret={activeBooking.clientSecret}
                onSuccess={() => {
                  setTimeout(() => {
                    setIsPaymentOpen(false);
                    closeAndReset();
                    window.location.href = '/booking/success';
                  }, 3000);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
