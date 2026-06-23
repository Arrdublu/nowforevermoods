'use client';
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getDb, getAuthService, handleFirestoreError } from "../lib/firebase";
import { format } from "date-fns";
import { Receipt, CheckCircle2, Loader2, Download, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserOrdersProps {
  onTrackOrder?: (orderId: string) => void;
}

export function UserOrders({ onTrackOrder }: UserOrdersProps) {
  const db = getDb();
  const auth = getAuthService();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "orders"),
      where("userId", "==", auth.currentUser.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => {
         const data = doc.data();
         return {
           id: doc.id,
           productId: typeof data.productId === 'string' ? data.productId : "",
           productName: typeof data.productName === 'string' ? data.productName : "",
           userId: typeof data.userId === 'string' ? data.userId : "",
           status: typeof data.status === 'string' ? data.status : "",
           currency: typeof data.currency === 'string' ? data.currency : "usd",
           amount: Number(data.amountTotal) || 0,
           createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt ? data.createdAt : ""
         } as any;
      }));
    }, (error) => {
      handleFirestoreError(error, 'list', 'orders');
    });
    return () => unsub();
  }, [auth.currentUser, db]);

  const generateReceipt = (order: any) => {
    const url = `/api/receipt?type=order&id=${order.id}`;
    window.open(url, '_blank');
  };

  const completedOrders = orders.filter(o => o.status === 'paid' || o.status === 'completed');

  if (completedOrders.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 border-b border-brand-line pb-4 mt-12">
        <Receipt className="w-5 h-5 text-brand-black" />
        <h2 className="text-2xl font-serif font-light text-brand-black tracking-tight">My Orders</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-line text-[10px] uppercase tracking-widest text-brand-muted font-bold">
              <th className="py-3 px-4 font-bold">Item</th>
              <th className="py-3 px-4 font-bold">Date</th>
              <th className="py-3 px-4 font-bold">Amount</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-4 font-bold text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {completedOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((order) => (
              <tr key={order.id} className="border-b border-brand-line hover:bg-zinc-50 transition-colors">
                <td className="py-4 px-4 font-medium text-brand-black">
                  {order.productName}
                </td>
                <td className="py-4 px-4 text-brand-muted">
                  {order.createdAt ? format(new Date(order.createdAt), 'PPP') : 'Unknown'}
                </td>
                <td className="py-4 px-4 font-mono text-xs">
                  ${order.amount.toFixed(2)}
                </td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3" /> Paid
                  </span>
                </td>
                <td className="py-4 px-4 text-right flex justify-end gap-2">
                  {onTrackOrder && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onTrackOrder(order.id)}
                      className="rounded-none border-brand-line text-[10px] uppercase tracking-widest font-bold hover:bg-[#a88d5e] hover:text-white hover:border-[#a88d5e]"
                    >
                      <Truck className="w-3.5 h-3.5 mr-1" /> Track
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => generateReceipt(order)}
                    className="rounded-none border-brand-line text-[10px] uppercase tracking-widest font-bold hover:bg-brand-black hover:text-white"
                  >
                    <Download className="w-3 h-3 mr-1" /> PDF
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
