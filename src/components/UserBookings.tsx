'use client';
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { getDb, getAuthService, handleFirestoreError } from "../lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Trash2, Edit2, X, Wallet, FileText, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";

export function UserBookings() {
  const db = getDb();
  const auth = getAuthService();
  const [bookings, setBookings] = useState<any[]>([]);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", auth.currentUser.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => {
         const data = doc.data();
         return {
           id: doc.id,
           packageId: typeof data.packageId === 'string' ? data.packageId : "",
           packageName: typeof data.packageName === 'string' ? data.packageName : "",
           userId: typeof data.userId === 'string' ? data.userId : "",
           status: typeof data.status === 'string' ? data.status : "",
           paymentStatus: typeof data.paymentStatus === 'string' ? data.paymentStatus : "",
           date: typeof data.date === 'string' ? data.date : "",
           time: typeof data.time === 'string' ? data.time : "",
           amount: Number(data.amountTotal || data.amount) || 0,
           createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : ""
         } as any;
      }));
    }, (error) => {
      handleFirestoreError(error, 'list', 'bookings');
    });
    return () => unsub();
  }, [auth.currentUser, db]);

  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!bookingToDelete) return;
    try {
      await deleteDoc(doc(db, "bookings", bookingToDelete));
      setBookingToDelete(null);
    } catch (err) {
      handleFirestoreError(err, 'delete', `bookings/${bookingToDelete}`);
    }
  };

  const handleEdit = (booking: any) => {
    setEditingBooking(booking);
    setNewNotes(booking.notes);
  };

  const saveEdit = async () => {
    if (!editingBooking) return;
    try {
      await updateDoc(doc(db, "bookings", editingBooking.id), { notes: newNotes });
      setEditingBooking(null);
    } catch (err) {
      handleFirestoreError(err, 'update', `bookings/${editingBooking.id}`);
    }
  };

  const serviceBookings = bookings.filter(b => b.packageId !== 'custom_balance');
  const pastPayments = bookings.filter(b => b.packageId === 'custom_balance' && (b.status === 'confirmed' || b.paymentStatus === 'paid' || b.status === 'completed'));
  const bookingDates = serviceBookings.map(b => b.date ? new Date(b.date) : null).filter(Boolean) as Date[];

  return (
    <div className="space-y-12">
      {/* Service Bookings Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-brand-line pb-4">
          <FileText className="w-5 h-5 text-brand-black" />
          <h2 className="text-2xl font-serif font-light text-brand-black tracking-tight">Active Sessions</h2>
        </div>
        
        {serviceBookings.length === 0 ? (
          <p className="text-sm text-brand-muted italic">No active sessions found.</p>
        ) : (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {serviceBookings.map((booking) => (
                  <Card key={booking.id} className="bg-white border-brand-line rounded-none shadow-sm">
                    <CardHeader className="flex flex-row justify-between items-center pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-widest text-brand-black">{booking.packageName}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(booking)}><Edit2 size={12} /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setBookingToDelete(booking.id)}><Trash2 size={12} /></Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-xs text-brand-muted tracking-wide">Date: <span className="text-brand-black font-medium">{booking.date ? format(new Date(booking.date), 'PPP') : 'N/A'}</span></p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-brand-muted tracking-wide flex items-center gap-1">
                            Status: <span className="uppercase text-[9px] font-bold tracking-widest">{booking.status}</span>
                          </p>
                          {booking.status === 'sanitized' && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] uppercase tracking-wider h-5 font-bold">
                              Project Data Sanitized
                            </Badge>
                          )}
                        </div>
                        {booking.notes && <p className="text-xs text-brand-muted mt-2 border-t border-brand-line pt-2 break-words">Notes: {booking.notes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <div className="shrink-0 w-fit">
              <div className="border border-brand-line bg-white shadow-sm pt-4 pb-2 px-4 rounded-none h-fit">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-black mb-2 px-3 text-center">Session Calendar</h3>
                <Calendar
                  mode="multiple"
                  selected={bookingDates}
                  className="rounded-none border-brand-line pointer-events-none p-0 !bg-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Payment History Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-brand-line pb-4">
          <Wallet className="w-5 h-5 text-brand-black" />
          <h2 className="text-2xl font-serif font-light text-brand-black tracking-tight">Payment History</h2>
        </div>
        
        {pastPayments.length === 0 ? (
          <p className="text-sm text-brand-muted italic">No past balance payments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-line text-[10px] uppercase tracking-widest text-brand-muted font-bold">
                  <th className="py-3 px-4 font-bold">Reference / Item</th>
                  <th className="py-3 px-4 font-bold">Date Paid</th>
                  <th className="py-3 px-4 font-bold">Amount</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pastPayments.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((payment) => (
                  <tr key={payment.id} className="border-b border-brand-line hover:bg-zinc-50 transition-colors">
                    <td className="py-4 px-4 font-medium text-brand-black">
                      {payment.packageName.replace('Custom Balance: ', '')}
                    </td>
                    <td className="py-4 px-4 text-brand-muted">
                      {payment.createdAt ? format(new Date(payment.createdAt), 'PPP') : 'Unknown'}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={!!bookingToDelete} onOpenChange={() => setBookingToDelete(null)}>
        <DialogContent className="rounded-none border border-brand-line">
            <DialogHeader><DialogTitle className="font-serif italic text-xl">Confirm Deletion</DialogTitle></DialogHeader>
            <p className="text-sm text-brand-muted">This action will remove the session from your dashboard.</p>
            <div className="flex gap-2 justify-end mt-4">
                <Button variant="ghost" className="rounded-none text-xs uppercase tracking-widest font-bold" onClick={() => setBookingToDelete(null)}>Cancel</Button>
                <Button variant="destructive" className="rounded-none text-xs uppercase tracking-widest font-bold" onClick={handleDelete}>Delete Session</Button>
            </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingBooking} onOpenChange={() => setEditingBooking(null)}>
        <DialogContent className="rounded-none border border-brand-line">
            <DialogHeader><DialogTitle className="font-serif italic text-xl">Edit Session Notes</DialogTitle></DialogHeader>
            <Input 
              value={newNotes} 
              onChange={(e) => setNewNotes(e.target.value)} 
              className="mt-4 rounded-none border-brand-line"
              placeholder="Add any specific requests or instructions..."
            />
            <Button onClick={saveEdit} className="w-full rounded-none bg-brand-black text-white hover:bg-zinc-800 text-xs uppercase tracking-widest font-bold h-12 mt-4">
              Save Changes
            </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
