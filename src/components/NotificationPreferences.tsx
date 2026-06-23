'use client';
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getDb, getAuthService, handleFirestoreError } from "../lib/firebase";
import { Bell, Mail, ShieldCheck, Loader2 } from "lucide-react";

export function NotificationPreferences() {
  const db = getDb();
  const auth = getAuthService();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    orderEmailNotifications: true,
  });

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", auth.currentUser.uid);
    
    // Using onSnapshot to keep UI fully in sync in real-time
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPreferences({
          orderEmailNotifications: data.orderEmailNotifications !== false, // default to true
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, "get", `users/${auth.currentUser?.uid}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser, db]);

  const handleToggle = async () => {
    if (!auth.currentUser) return;

    setSaving(true);
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const newValue = !preferences.orderEmailNotifications;

    try {
      // Use setDoc with merge: true to avoid overwriting or create if it doesn't exist
      await setDoc(userDocRef, {
        orderEmailNotifications: newValue,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setPreferences({ orderEmailNotifications: newValue });
    } catch (error) {
      handleFirestoreError(error, "write", `users/${auth.currentUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  if (!auth.currentUser) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 border-b border-brand-line pb-4 mt-12">
        <Bell className="w-5 h-5 text-brand-black" />
        <h2 className="text-2xl font-serif font-light text-brand-black tracking-tight">Notification Preferences</h2>
      </div>

      <div className="bg-white border border-brand-line p-6 md:p-8 rounded-none shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-3xl">
        <div className="flex gap-4 items-start max-w-xl">
          <div className="p-3 bg-zinc-50 border border-brand-line shrink-0">
            <Mail className="w-5 h-5 text-brand-black" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-black">Order Status & Shipping Updates</h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Receive automated, live email notifications when your boutique order tracking changes, is processed, or is out for delivery.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          {saving && <Loader2 className="w-4 h-4 text-brand-muted animate-spin" />}
          
          <button
            type="button"
            role="switch"
            aria-checked={preferences.orderEmailNotifications}
            disabled={loading || saving}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-brand-black focus:ring-offset-2 disabled:opacity-50 ${
              preferences.orderEmailNotifications ? "bg-brand-black" : "bg-neutral-200"
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                preferences.orderEmailNotifications ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#a88d5e] font-bold">
        <ShieldCheck className="w-4 h-4" /> Securely stored in your subscriber profile
      </div>
    </section>
  );
}
