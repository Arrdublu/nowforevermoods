'use client';
import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, where, Timestamp, getDoc, addDoc, deleteDoc, setDoc } from "firebase/firestore";
import { getDb, getAuthService, getStorageService, handleFirestoreError, FirestoreErrorInfo } from "../lib/firebase";
import { AdminMediaUploader } from "./AdminMediaUploader";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, DollarSign, Users, Activity, Filter, X, Image as ImageIcon, Upload, Trash2, FileVideo, FileImage, Edit2 } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export function AdminDashboard() {
  const db = getDb();
  const auth = getAuthService();
  const [bookings, setBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expertiseFilter, setExpertiseFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Portfolio
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState({ title: '', description: '', category: 'editorial' });

  // Edit Portfolio
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editMeta, setEditMeta] = useState({ title: '', description: '', category: 'editorial' });

  useEffect(() => {
    if (!isAuthorized) return;
    const qPortfolio = query(collection(getDb(), "portfolio_items"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(qPortfolio, (snapshot) => {
      setPortfolioItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, 'list', 'portfolio_items');
    });
    return () => unsub();
  }, [isAuthorized]);


  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/");
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAuthorized(true);
        } else if (user.email === 'hi@arrdublu.us') {
          // Fallback / Initial Setup for owner
          await setDoc(doc(db, "users", user.uid), { email: user.email, role: 'admin' }, { merge: true });
          setIsAuthorized(true);
        } else {
          router.push("/");
        }
      } catch (e) {
        router.push("/");
      }
    };
    
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;

    // Fetch Bookings
    const qBookings = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
    }, (error) => {
      handleFirestoreError(error, 'list', 'bookings');
    });

    return () => unsubBookings();
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;

    setLoading(true);
    let qTransactions = query(collection(db, "transactions"), orderBy("createdAt", "desc"));

    if (statusFilter !== "all") {
      qTransactions = query(qTransactions, where("status", "==", statusFilter));
    }

    if (dateFrom) {
      const start = Timestamp.fromDate(startOfDay(new Date(dateFrom)));
      qTransactions = query(qTransactions, where("createdAt", ">=", start));
    }

    if (dateTo) {
      const end = Timestamp.fromDate(endOfDay(new Date(dateTo)));
      qTransactions = query(qTransactions, where("createdAt", "<=", end));
    }

    const unsubscribe = onSnapshot(qTransactions, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list', 'transactions');
    });

    return () => unsubscribe();
  }, [statusFilter, dateFrom, dateTo]);

  const resetFilters = () => {
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), { status, updatedAt: new Date() });
      
      const targetBooking = bookings.find(b => b.id === id);
      if (status === 'confirmed' && targetBooking && targetBooking.userEmail) {
        await addDoc(collection(db, "mail"), {
          to: [targetBooking.userEmail, 'hi@arrdublu.us'],
          message: {
            subject: `Session Confirmed: ${targetBooking.packageName || 'Your Package'} | NowForeverMoods`,
            text: `Dear ${targetBooking.userName || 'Client'},\n\nYour session for ${targetBooking.packageName || 'the package'} has been confirmed.\n\nBest,\nNowForeverMoods Collective`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px;">
                <h1 style="font-weight: 300; letter-spacing: 2px; font-size: 24px;">NOWFOREVER<span style="color: #6ab04c;">MOODS</span></h1>
                <p style="text-transform: uppercase; letter-spacing: 4px; font-size: 10px; color: #aaa; margin-bottom: 40px;">Session Confirmed</p>
                <p>Hello ${targetBooking.userName || 'Client'},</p>
                <p>Your session for the <strong>${targetBooking.packageName || 'package'}</strong> has been officially confirmed by our terminal.</p>
                <p>We look forward to collaborating with you.</p>
                <hr style="border-color: #333; margin: 40px 0;" />
                <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px;">Thank you for choosing the NowForeverMoods Collective.</p>
              </div>
            `
          }
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      default: return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20';
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-12 bg-brand-bg min-h-screen text-brand-text pt-24 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-light mb-1 text-brand-black tracking-tight">Administrative Terminal</h1>
          <p className="text-brand-muted text-[10px] tracking-[0.3em] font-bold uppercase italic">Logistics & Oversight</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="border-brand-line rounded-none text-[10px] uppercase tracking-widest font-bold bg-white text-brand-black">Export Vault Data</Button>
          <Button className="bg-brand-black text-white hover:bg-zinc-800 rounded-none text-[10px] uppercase tracking-widest font-bold px-8">Update Rates</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-brand-line border border-brand-line shadow-sm">
        {[
          { label: "Active Requests", value: bookings.length, icon: CalendarIcon },
          { label: "Confirmed Revenue", value: `$${transactions.reduce((acc, t) => acc + (t.amount || 0), 0).toLocaleString()}`, icon: DollarSign },
          { label: "Portfolio Items", value: portfolioItems.length, icon: ImageIcon },
          { label: "Terminal Health", value: "Optimal", icon: Activity },
        ].map((stat, i) => (
          <Card key={i} className="bg-white border-none rounded-none shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">{stat.label}</CardTitle>
              <stat.icon className="h-3 w-3 text-brand-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-light text-brand-black tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="logistics" className="w-full mt-8">
        <TabsList className="bg-brand-surface rounded-none p-1 border border-brand-line mb-8">
          <TabsTrigger value="logistics" className="rounded-none text-[10px] uppercase font-bold tracking-widest data-active:bg-white">Logistics & Ledger</TabsTrigger>
          <TabsTrigger value="portfolio" className="rounded-none text-[10px] uppercase font-bold tracking-widest data-active:bg-white">Assets & Portfolio</TabsTrigger>
        </TabsList>

        <TabsContent value="logistics" className="space-y-12">
          {/* Bookings Section */}
          <Card className="bg-white border-brand-line rounded-none shadow-none overflow-hidden">
        <CardHeader className="border-b border-brand-line py-6 bg-brand-surface/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <CardTitle className="text-xl font-serif font-light text-brand-black tracking-tight">Reservation Registry</CardTitle>
              <div className="flex gap-4 mt-2">
                {['all', 'production', 'beauty'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setExpertiseFilter(filter)}
                    className={`text-[9px] uppercase tracking-widest font-bold transition-all ${expertiseFilter === filter ? 'text-brand-accent border-b border-brand-accent' : 'text-brand-muted hover:text-brand-black opacity-60'}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            
            {bookings.some(b => b.type === 'wedding' && b.status === 'pending') && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-500 text-white p-4 flex items-center gap-4 shadow-lg"
              >
                <Activity className="h-5 w-5 animate-spin-slow" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Calendar Sync Lock</span>
                  <span className="text-[8px] uppercase tracking-tighter opacity-90">Wedding Invoices Pending Dual-Lead Verification (Arrdublu/Ioka)</span>
                </div>
              </motion.div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-brand-surface text-brand-muted text-[9px] uppercase tracking-[0.2em] font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-6">Entity Reference</th>
                  <th className="p-6">Collection</th>
                  <th className="p-6">Date</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {bookings
                  .filter(b => {
                    if (expertiseFilter === 'all') return true;
                    if (expertiseFilter === 'production') return b.packageName.includes('Heirloom') || b.type === 'signature';
                    if (expertiseFilter === 'beauty') return b.needsBeautyConsult || b.type === 'wedding';
                    return true;
                  })
                  .map((booking) => (
                  <tr key={booking.id} className="hover:bg-brand-surface transition-colors group">
                    <td className="p-6">
                      <div className="text-sm font-medium text-brand-black">{booking.userId.slice(0, 8)}...</div>
                      <div className="text-[9px] text-brand-muted uppercase tracking-tighter">REF: {booking.id.slice(0, 8)}</div>
                    </td>
                    <td className="p-6">
                      <div className="text-sm font-medium text-brand-black">{booking.packageName}</div>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 bg-brand-surface border border-brand-line text-brand-muted">Prod: Arrdublu</span>
                        <span className="text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 bg-brand-surface border border-brand-line text-brand-accent">Beauty: Ioka</span>
                        {booking.needsBeautyConsult && (
                          <span className="text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 bg-amber-500 text-white animate-pulse">Trial Reqd</span>
                        )}
                      </div>
                    </td>
                    <td className="p-6 text-sm text-brand-muted">
                      {booking.date ? format(new Date(booking.date), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="p-6">
                      <Badge variant="outline" className={`${getStatusColor(booking.status)} rounded-none uppercase text-[8px] tracking-[0.2em] py-1 px-3 font-bold border`}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-4">
                        {booking.status === 'pending' && (
                          <div className="flex flex-col gap-2">
                             <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[10px] uppercase font-bold text-emerald-600 hover:text-emerald-700 p-0 h-auto"
                              onClick={() => updateStatus(booking.id, 'confirmed')}
                            >
                              Sync Verify
                            </Button>
                            {booking.type === 'wedding' && (
                               <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-[10px] uppercase font-bold text-amber-500 hover:text-amber-600 p-0 h-auto flex items-center gap-1"
                                onClick={() => {
                                  alert(`ALERT: Deployment notifications triggered to Arrdublu (Production) and Ioka (Beauty) for ${booking.packageName}. Calendar sync in progress.`);
                                }}
                              >
                                <Activity size={10} /> Notify Leads
                              </Button>
                            )}
                          </div>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[10px] uppercase font-bold text-brand-muted p-0 h-auto opacity-40 group-hover:opacity-100"
                        >
                          Telemetry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Production Tasking Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-white border-brand-line rounded-none shadow-none">
          <CardHeader className="border-b border-brand-line bg-brand-surface/30">
             <div className="flex items-center gap-3">
               <Activity className="text-brand-accent h-4 w-4" />
               <CardTitle className="text-sm uppercase tracking-[0.3em] font-bold text-brand-black">Arrdublu: Production Pipeline</CardTitle>
             </div>
          </CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[300px]">
               <div className="divide-y divide-brand-line">
                 {bookings.filter((b: any) => b.status === 'confirmed' || b.status === 'pending').map((b: any) => (
                   <div key={b.id} className="p-6 hover:bg-brand-surface transition-colors">
                     <div className="flex justify-between items-start mb-4">
                       <span className="text-[10px] font-bold text-brand-black uppercase tracking-widest">{b.packageName}</span>
                       <span className="text-[8px] font-bold text-brand-muted uppercase tracking-widest">{b.date ? format(new Date(b.date), 'MMM dd') : 'TBD'}</span>
                     </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[9px] text-brand-muted font-bold uppercase tracking-tighter">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                          Technical Load-out: {b.packageName.includes('Heirloom') ? 'Full Cinema Rig' : 'Editorial Stills Kit'}
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-brand-muted font-bold uppercase tracking-tighter">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                          Location Recon & Lighting Map
                        </div>
                     </div>
                   </div>
                 ))}
                 {bookings.filter((b: any) => b.status === 'confirmed' || b.status === 'pending').length === 0 && (
                   <div className="p-12 text-center text-[10px] uppercase font-bold text-brand-muted tracking-[0.3em]">No Pending Technical Tasks</div>
                 )}
               </div>
             </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-white border-brand-line rounded-none shadow-none">
          <CardHeader className="border-b border-brand-line bg-brand-surface/30">
             <div className="flex items-center gap-3">
               <Activity className="text-brand-accent h-4 w-4" />
               <CardTitle className="text-sm uppercase tracking-[0.3em] font-bold text-brand-black">Ioka: Artistry Suite</CardTitle>
             </div>
          </CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[300px]">
                <div className="divide-y divide-brand-line">
                 {bookings.filter((b: any) => b.status === 'confirmed' || b.status === 'pending').map((b: any) => (
                   <div key={b.id} className="p-6 hover:bg-brand-surface transition-colors">
                     <div className="flex justify-between items-start mb-4">
                       <span className="text-[10px] font-bold text-brand-black uppercase tracking-widest">{b.packageName}</span>
                       <span className="text-[8px] font-bold text-brand-muted uppercase tracking-widest">{b.date ? format(new Date(b.date), 'MMM dd') : 'TBD'}</span>
                     </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[9px] text-brand-muted font-bold uppercase tracking-tighter">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                          Beauty Brief: {b.packageName.includes('Wedding') ? 'Luxury Bridal Artistry' : 'Editorial Grooming'}
                        </div>
                        {b.needsBeautyConsult && (
                          <div className="flex items-center gap-2 text-[9px] text-amber-600 font-bold uppercase tracking-tighter animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                            Action: Schedule Artistry Trial
                          </div>
                        )}
                     </div>
                   </div>
                 ))}
                 {bookings.filter((b: any) => b.status === 'confirmed' || b.status === 'pending').length === 0 && (
                   <div className="p-12 text-center text-[10px] uppercase font-bold text-brand-muted tracking-[0.3em]">No Pending Artistry Tasks</div>
                 )}
               </div>
             </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Section */}
      <Card className="bg-white border-brand-line rounded-none shadow-none overflow-hidden">
        <CardHeader className="border-b border-brand-line py-6 bg-brand-surface/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <CardTitle className="text-xl font-serif font-light text-brand-black tracking-tight">Ledger Terminal</CardTitle>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-brand-accent" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-brand-line text-[10px] uppercase font-bold tracking-widest px-3 py-2 outline-none focus:border-brand-accent transition-colors"
                >
                  <option value="all">All States</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-[9px] uppercase font-bold tracking-widest text-brand-muted">From</Label>
                  <Input 
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8 w-32 rounded-none border-brand-line text-[10px] uppercase tracking-tighter"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[9px] uppercase font-bold tracking-widest text-brand-muted">To</Label>
                  <Input 
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-8 w-32 rounded-none border-brand-line text-[10px] uppercase tracking-tighter"
                  />
                </div>
              </div>

              {(statusFilter !== "all" || dateFrom || dateTo) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetFilters}
                  className="h-8 px-2 text-brand-black hover:bg-brand-surface rounded-none"
                >
                  <X size={14} className="mr-2" />
                  <span className="text-[9px] uppercase font-bold tracking-widest">Reset</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-brand-surface text-brand-muted text-[9px] uppercase tracking-[0.2em] font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-6">Ledger ID</th>
                  <th className="p-6">Allocation</th>
                  <th className="p-6">Volume</th>
                  <th className="p-6">Currency</th>
                  <th className="p-6">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-line">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-brand-surface transition-colors">
                    <td className="p-6">
                      <div className="text-sm font-medium text-brand-black uppercase tracking-widest">{t.id.slice(0, 12)}</div>
                      <div className="text-[9px] text-brand-muted uppercase tracking-tighter">SESSION: {t.sessionId.slice(0, 12)}</div>
                    </td>
                    <td className="p-6">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-brand-black">Booking ID</div>
                      <div className="text-sm text-brand-muted">{t.bookingId}</div>
                    </td>
                    <td className="p-6 text-2xl font-light text-brand-black italic">
                      {t.amount?.toLocaleString()}
                    </td>
                    <td className="p-6 text-[10px] font-bold text-brand-muted uppercase tracking-widest">
                      {t.currency}
                    </td>
                    <td className="p-6">
                      <Badge variant="outline" className={`${getStatusColor(t.status)} rounded-none uppercase text-[8px] tracking-[0.2em] py-1 px-3 font-bold`}>
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && !loading && (
              <div className="py-24 text-center text-brand-muted uppercase tracking-[0.4em] text-[10px] font-bold">
                No ledger activity recorded.
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="portfolio" className="space-y-8">
        <AdminMediaUploader />
      </TabsContent>
    </Tabs>


    </div>
  );
}
