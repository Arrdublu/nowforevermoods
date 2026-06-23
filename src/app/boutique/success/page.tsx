"use client";
import React, { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { RecentReceipt } from "@/components/RecentReceipt";
import { EmailPreview } from "@/components/EmailPreview";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl w-full p-12 bg-white border border-brand-line shadow-2xl relative text-center flex flex-col items-center"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent" />
      <div className="mx-auto w-16 h-16 border rounded-full border-brand-line flex items-center justify-center bg-brand-surface mb-8">
        <CheckCircle className="h-8 w-8 text-brand-accent" />
      </div>
      <h1 className="text-4xl font-serif font-light text-brand-black tracking-tight mb-4">Payment Cleared</h1>
      <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 mb-8 pb-8 border-b border-brand-line w-full">
        Order Secured
      </p>
      
      <div className="space-y-4 mb-8 text-sm text-brand-muted text-left w-full">
        <p>If you purchased a digital item, your secure download link has been emailed to you.</p>
        <p>If you purchased a physical item, we will notify you once it ships.</p>
      </div>

      <div className="space-y-4 w-full">
        <Link href="/boutique" className="block w-full">
          <Button className="w-full bg-brand-black text-white hover:bg-zinc-800 rounded-none h-12 text-[10px] uppercase font-bold tracking-widest">
            Return to Boutique
          </Button>
        </Link>
        <RecentReceipt type="order" />
      </div>

      <EmailPreview type="order" />
    </motion.div>
  );
}

export default function OrderSuccess() {
  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-accent/20 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-8 pt-32 pb-32">
        <Suspense fallback={<div className="text-[10px] uppercase font-bold tracking-[0.3em] text-brand-muted animate-pulse">Verifying Transaction...</div>}>
          <SuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
