'use client';

import React, { useEffect, useState } from "react";
import { getAuthService, getDb } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";

export function RecentReceipt({ type = 'booking' }: { type?: 'booking' | 'order' }) {
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    const auth = getAuthService();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const db = getDb();
        const collectionName = type === 'order' ? 'orders' : 'bookings';
        
        let q = query(
          collection(db, collectionName),
          where("userId", "==", user.uid)
        );
        
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        
        // Filter paid items and sort by date since compound queries with inequality need composite indexes
        const paidItems = docs.filter(d => 
          (d.status === 'paid' || d.status === 'confirmed' || d.status === 'completed' || d.paymentStatus === 'paid')
        ).sort((a, b) => {
          const dateA = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        if (paidItems.length > 0) {
          setItem(paidItems[0]);
        }
      } catch (err: any) {
        console.error("Error fetching recent receipt:", err?.message || String(err));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [type]);

  const generatePDF = () => {
    if (!item) return;
    const url = `/api/receipt?type=${type}&id=${item.id}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Button disabled variant="outline" className="mt-6 rounded-none border-brand-line text-[10px] uppercase font-bold text-brand-muted cursor-not-allowed">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching Receipt...
      </Button>
    )
  }

  if (!item) return null;

  return (
    <Button 
      onClick={generatePDF}
      variant="outline"
      className="mt-6 rounded-none border-emerald-500/50 bg-emerald-500/5 text-[10px] uppercase tracking-widest font-bold hover:bg-emerald-500 hover:text-white transition-all text-emerald-700"
    >
      <Download className="w-4 h-4 mr-2" /> Download Receipt
    </Button>
  );
}
