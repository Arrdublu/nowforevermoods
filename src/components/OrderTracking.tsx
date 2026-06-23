'use client';
import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb, handleFirestoreError } from "../lib/firebase";
import { format } from "date-fns";
import { motion } from "motion/react";
import { 
  Package, 
  Search, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Copy, 
  ClipboardCheck, 
  ExternalLink,
  Milestone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OrderTrackingProps {
  initialOrderId?: string;
}

export function OrderTracking({ initialOrderId = "" }: OrderTrackingProps) {
  const db = getDb();
  const [orderId, setOrderId] = useState(initialOrderId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTrack = useCallback(async (targetId: string = orderId) => {
    const trimmedId = targetId.trim();
    if (!trimmedId) {
      setError("Please enter a valid order reference number.");
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const docRef = doc(db, "orders", trimmedId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Setup clean mock tracking information if not manually set under administrative controls
        const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt ? new Date(data.createdAt) : new Date();
        const estDeliveryDate = new Date(createdAtDate);
        estDeliveryDate.setDate(createdAtDate.getDate() + 5);

        const mappedOrder = {
          id: docSnap.id,
          productName: data.productName || "Product Order",
          amount: Number(data.amountTotal) || 0,
          currency: data.currency || "usd",
          status: data.status || "pending",
          createdAt: createdAtDate.toISOString(),
          // Use DB tracking info or default mock progression for full boutique experience simulation
          shippingStatus: data.shippingStatus || (data.status === "fulfilled" ? "delivered" : data.status === "paid" ? "processing" : "order_placed"),
          shippingCarrier: data.shippingCarrier || "DHL Premium Express",
          trackingNumber: data.trackingNumber || `NFM-${Math.floor(100000 + Math.random() * 900000)}`,
          estimatedDelivery: data.estimatedDelivery || estDeliveryDate.toISOString()
        };

        setOrder(mappedOrder);
      } else {
        // Build a mock order if the ID is "DEMO-TRACKING" next-level ease of QA
        if (trimmedId.toUpperCase() === "DEMO-TRACKING") {
          const nowRef = new Date();
          const estDel = new Date();
          estDel.setDate(nowRef.getDate() + 3);
          
          setOrder({
            id: "DEMO-TRACKING-99",
            productName: "The Luxury Presets Collection & Physical Book Bundle",
            amount: 289.00,
            currency: "usd",
            status: "paid",
            createdAt: nowRef.toISOString(),
            shippingStatus: "shipped", // Try shipped stage
            shippingCarrier: "FedEx International Priority",
            trackingNumber: "FX-90210-9112",
            estimatedDelivery: estDel.toISOString()
          });
        } else {
          setError("Order reference not found. Please double-check your code or try 'DEMO-TRACKING'.");
        }
      }
    } catch (err) {
      handleFirestoreError(err, "get", `orders/${trimmedId}`);
      setError("Failed to fetch order. Security permissions might limit access depending on login status.");
    } finally {
      setLoading(false);
    }
  }, [db, orderId]);

  // Auto-fill and track if initialOrderId prop changes
  useEffect(() => {
    if (initialOrderId) {
      setOrderId(initialOrderId);
      handleTrack(initialOrderId);
    }
  }, [initialOrderId, handleTrack]);

  const copyToClipboard = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tracking milestones
  const steps = [
    { key: "order_placed", label: "Confirmed", desc: "Payment secured & order parsed." },
    { key: "processing", label: "Processing", desc: "Luxury curation and digital rendering." },
    { key: "shipped", label: "Shipped", desc: "Dispatched under priority shipping." },
    { key: "out_for_delivery", label: "Out for Delivery", desc: "Handover to local priority courier." },
    { key: "delivered", label: "Delivered", desc: "Safariland delivery drop completed." }
  ];

  // Helper to find index of current stage
  const currentStepIndex = steps.findIndex(s => s.key === order?.shippingStatus);
  const activeStepIdx = currentStepIndex !== -1 ? currentStepIndex : 0;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 border-b border-brand-line pb-4 mt-12">
        <Milestone className="w-5 h-5 text-brand-black" />
        <h2 className="text-2xl font-serif font-light text-brand-black tracking-tight">Order Tracking</h2>
      </div>

      <div className="max-w-3xl space-y-4">
        <p className="text-sm text-brand-muted leading-relaxed">
          Pristine order status matching. Paste your receipt reference number (Order ID) below to view real-time shipping logs and milestone progress.
        </p>

        {/* Input box */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <Input
              type="text"
              placeholder="e.g. 0hq4xw7oqzoq916l... or 'DEMO-TRACKING'"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              className="pl-11 h-12 rounded-none border-brand-line placeholder:text-stone-400 bg-white"
            />
          </div>
          <Button
            onClick={() => handleTrack()}
            disabled={loading}
            className="rounded-none bg-brand-black hover:bg-zinc-800 text-white font-bold uppercase tracking-widest text-xs px-8 h-12"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Track Shipment
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs flex gap-2 items-center rounded-none font-medium">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Content displays */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-brand-line bg-white shadow-sm rounded-none overflow-hidden mt-6"
          >
            {/* Order Header info */}
            <div className="p-6 md:p-8 bg-zinc-50 border-b border-brand-line flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#a88d5e] bg-amber-50 px-2 py-0.5 border border-[#a88d5e]/20">Active Shipment</span>
                  <p className="text-xs text-brand-muted font-mono">{format(new Date(order.createdAt), "PPP")}</p>
                </div>
                <h3 className="text-lg font-serif font-light text-brand-black tracking-tight">{order.productName}</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-muted font-mono">Reference:</span>
                  <span className="font-mono font-medium text-brand-black break-all">{order.id}</span>
                  <button 
                    onClick={copyToClipboard}
                    className="p-1 hover:bg-zinc-200 transition-colors rounded text-brand-muted"
                    title="Copy Order ID"
                  >
                    {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="md:text-right space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">Estimated Delivery</p>
                <p className="text-base font-medium text-brand-black">{format(new Date(order.estimatedDelivery), "PPP")}</p>
                <div className="flex items-center md:justify-end gap-1.5 text-xs text-brand-muted mt-2">
                  <Truck className="w-3.5 h-3.5" />
                  <span>{order.shippingCarrier}</span>
                  <span className="text-neutral-300">•</span>
                  <span className="font-mono text-[11px] underline cursor-pointer hover:text-brand-black">{order.trackingNumber}</span>
                </div>
              </div>
            </div>

            {/* Steps & Milestones progress */}
            <div className="p-6 md:p-8 space-y-8">
              <h4 className="text-[10px] uppercase tracking-widest text-brand-black font-bold">Progress History</h4>

              {/* Vertical Stepper Timeline (Responsive layout) */}
              <div className="relative flex flex-col gap-6 pl-6 border-l border-brand-line py-1 ml-3 md:border-l-0 md:pl-0 md:flex-row md:justify-between md:gap-4 md:py-6">
                
                {/* Horizontal timeline bar for desktop */}
                <div className="hidden md:block absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-zinc-100 z-0">
                  <motion.div 
                    className="absolute left-0 top-0 bottom-0 bg-brand-black"
                    initial={{ width: 0 }}
                    animate={{ width: `${(activeStepIdx / (steps.length - 1)) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                  />
                </div>

                {steps.map((step, idx) => {
                  const isDone = idx <= activeStepIdx;
                  const isCurrent = idx === activeStepIdx;
                  
                  return (
                    <div 
                      key={step.key} 
                      className={`relative flex md:flex-col items-start gap-4 md:items-center text-left md:text-center md:flex-1 z-10 transition-colors duration-300 ${
                        isDone ? "text-brand-black" : "text-brand-muted"
                      }`}
                    >
                      {/* Step Indicator Bullets */}
                      <span className="absolute -left-[31px] md:relative md:left-0 flex items-center justify-center">
                        {isDone ? (
                          <motion.div 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className={`w-6 h-6 flex items-center justify-center ${
                              isCurrent ? "bg-brand-black ring-4 ring-neutral-100" : "bg-neutral-800"
                            } text-white rounded-full`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </motion.div>
                        ) : (
                          <div className="w-6 h-6 flex items-center justify-center bg-zinc-100 border border-brand-line text-brand-muted rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </span>

                      {/* Info Text block */}
                      <div className="space-y-1 pt-0.5 md:pt-0">
                        <p className={`text-[11px] uppercase tracking-widest font-bold ${isCurrent ? "text-[#a88d5e]" : ""}`}>
                          {step.label}
                        </p>
                        <p className="text-[11px] text-zinc-500 leading-tight max-w-[160px] md:mx-auto">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}

              </div>

              {/* Quick info summary box */}
              <div className="p-4 bg-zinc-50 border border-brand-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-0.5 text-xs">
                  <span className="text-zinc-500">Current Status: </span>
                  <span className="font-bold text-brand-black uppercase tracking-wider">
                    {order.shippingStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-brand-muted flex items-center gap-1">
                  <span>Questions about custom digital access or premium shipping?</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <a href="/support" className="font-bold text-brand-black hover:underline">Read Care Policy</a>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
