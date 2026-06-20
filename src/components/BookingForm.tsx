'use client';
import { useState, useEffect, Suspense } from "react";
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
import { useSearchParams } from "next/navigation";

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
  return (
    <Suspense fallback={null}>
      <BookingFormContent isOpen={isOpen} onClose={onClose} selectedPackage={selectedPackage} currency={currency} />
    </Suspense>
  );
}

function BookingFormContent({ isOpen, onClose, selectedPackage, currency }: BookingFormProps) {
  const db = getDb();
  const auth = getAuthService();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<{ id: string, amount: number, clientSecret?: string } | null>(null);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [stripeKeyMissingError, setStripeKeyMissingError] = useState(false);
  const [simulatedDocId, setSimulatedDocId] = useState<string | null>(null);
  const [simulatedAmount, setSimulatedAmount] = useState<number>(0);

  const handleSimulatedPaymentSuccess = async () => {
    if (!simulatedDocId) return;
    setLoading(true);
    try {
      const confirmData = {
        bookingId: simulatedDocId,
        userId: auth.currentUser?.uid || 'guest',
        amount: simulatedAmount,
        status: 'confirmed',
        confirmedAt: new Date(),
        isSimulated: true
      };
      await addDoc(collection(db, "bookingConfirmations"), confirmData);
      setStripeKeyMissingError(false);
      setIsPaymentOpen(false);
      setSuccessMessage("Your booking has been confirmed successfully (via Simulation Mode)! We look forward to your session.");
    } catch (err) {
      console.error(err?.message || err);
      alert("Simulation failed, please try again.");
    } finally {
      setLoading(false);
    }
  };

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
        console.error("Failed to fetch booked dates", err?.message || err);
        // Only throw if missing permissions, otherwise just log
        if (err instanceof Error && err.message.includes('permission')) {
          handleFirestoreError(err, 'list', 'availability');
        }
      }
    };
    
    fetchBookedDates();
    return () => { isMounted = false; };
  }, [isOpen, db]);

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

  useEffect(() => {
    if (isOpen) {
      const refId = searchParams.get('ref');
      const refTitle = searchParams.get('title');
      if (refId && refTitle) {
        const currentNotes = watch('notes');
        if (!currentNotes || currentNotes === "" || currentNotes.includes("Inquiring about:")) {
          setValue('notes', `Inquiring about: ${refTitle} (Reference ID: ${refId})\n\n`, { shouldValidate: true });
        }
      }
    }
  }, [isOpen, searchParams, setValue, watch]);

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
          bookingId: docRef.id,
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
          } else if (data.stripeKeyMissing) {
            setSimulatedDocId(docRef.id);
            setSimulatedAmount(Math.round(finalAmount * 100));
            setStripeKeyMissingError(true);
          } else {
            throw new Error(data.error || "Payment terminal initialization failed");
          }
        } catch (payErr: any) {
          console.error("Payment Intent Error:", payErr?.message || payErr);
          let msg = payErr.message || "";
          if (msg.includes("Invalid API Key") || msg.includes("STRIPE") || msg.includes("secrets/") || msg.includes("missing or invalid")) {
            setSimulatedDocId(docRef.id);
            setSimulatedAmount(Math.round(finalAmount * 100));
            setStripeKeyMissingError(true);
          } else {
            alert(`Booking initiated, however payment setup failed: ${msg}`);
          }
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
      console.error("Booking error:", error?.message || error);
      alert("System failure. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeAndReset = () => {
    reset();
    setIsConfirming(false);
    setTermsAccepted(false);
    setSuccessMessage(null);
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
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        console.error("Login failed:", error?.message || error);
      }
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
          
          {successMessage ? (
            <div className="p-10 text-center flex flex-col items-center">
               <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
               <h3 className="text-2xl font-serif text-brand-black mb-2">Booking Confirmed</h3>
               <p className="text-brand-muted text-sm max-w-sm mb-8">{successMessage}</p>
               <Button onClick={closeAndReset} className="bg-brand-black text-white hover:bg-zinc-800 rounded-none uppercase tracking-widest text-[10px] font-bold h-12 px-8">
                 Close Panel
               </Button>
            </div>
          ) : (
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

              <div className="flex items-center gap-4 pt-4 border-t border-brand-line">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsTermsModalOpen(true)}
                  className="rounded-none text-[9px] uppercase tracking-widest font-bold border-brand-line hover:bg-brand-surface transition-colors"
                >
                  View Terms
                </Button>
                <div className="text-[9px] font-bold uppercase tracking-widest">
                  {termsAccepted ? (
                    <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12}/> Terms Accepted</span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12}/> Terms Not Accepted</span>
                  )}
                </div>
              </div>

              <Button 
                type="submit"
                className="bg-[#111111] text-[#ffffff] font-sans uppercase tracking-[0.1em] px-8 py-3 h-auto border border-[#333333] rounded transition-all duration-300 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] hover:bg-[#2a2a2a] hover:border-[#555555] hover:-translate-y-px active:translate-y-px active:bg-[#000000] disabled:opacity-50 disabled:pointer-events-none"
                disabled={loading || !termsAccepted}
              >
                {loading ? <Loader2 className="animate-spin" /> : "Secure Booking"}
              </Button>
            </form>
          )}
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
                onSuccess={async () => {
                  try {
                    const confirmData = {
                      bookingId: activeBooking.id,
                      userId: auth.currentUser?.uid || 'guest',
                      amount: activeBooking.amount,
                      status: 'confirmed',
                      confirmedAt: new Date(),
                    };
                    await addDoc(collection(db, "bookingConfirmations"), confirmData);
                    setIsPaymentOpen(false);
                    setSuccessMessage("Your booking has been confirmed successfully! We look forward to your session.");
                  } catch (err) {
                    handleFirestoreError(err, 'create', 'bookingConfirmations');
                  }
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTermsModalOpen} onOpenChange={setIsTermsModalOpen}>
        <DialogContent className="bg-brand-surface border-brand-line text-brand-text sm:max-w-[600px] rounded-3xl p-8 overflow-y-auto max-h-[80vh] shadow-2xl z-[200]">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-serif text-3xl text-brand-black font-light">Terms & Conditions</DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold tracking-widest text-brand-muted mt-2">
              Please review before securing your booking
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-brand-muted space-y-6 mb-8 leading-relaxed font-medium">
            <p>1. <strong className="text-brand-black font-bold">Session Agreements:</strong> You agree to provide accurate information and honor the scheduled booking time.</p>
            <p>2. <strong className="text-brand-black font-bold">Payment & Retainers:</strong> A retainer or full payment is required to lock in your date. Retainers are non-refundable.</p>
            <p>3. <strong className="text-brand-black font-bold">Cancellation Policy:</strong> Cancellations made within 48 hours of the session forfeit all payments. Rescheduling is subject to availability.</p>
            <p>4. <strong className="text-brand-black font-bold">Delivery & Rights:</strong> Arrdublu Productions retains creative rights. Deliverables will be provided as outlined in your selected package.</p>
            <p className="pt-4 border-t border-brand-line italic">By accepting these terms, you enter into a binding agreement with Arrdublu Productions.</p>
          </div>
          <div className="flex gap-4 justify-end">
            <Button 
              type="button"
              variant="outline"
              onClick={() => {
                setTermsAccepted(false);
                setIsTermsModalOpen(false);
              }}
              className="rounded-none uppercase tracking-widest text-[10px] font-bold border-brand-line hover:bg-brand-surface"
            >
              Reject
            </Button>
            <Button 
              type="button"
              onClick={() => {
                setTermsAccepted(true);
                setIsTermsModalOpen(false);
              }}
              className="bg-brand-black text-white hover:bg-zinc-800 rounded-none uppercase tracking-widest text-[10px] font-bold px-8 shadow-md"
            >
              Accept
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                <p className="text-[11px] text-brand-muted leading-relaxed">You can bypass live Stripe checkouts to fully test booking confirmations, database logs, and system email pipelines.</p>
              </div>

              <div className="grid gap-3 pt-2">
                <Button 
                  onClick={handleSimulatedPaymentSuccess}
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
    </>
  );
}
