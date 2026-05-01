'use client';

import { useEffect, useState } from "react";
import { getAuthService } from "@/lib/firebase";
import { onAuthStateChanged, User, GoogleAuthProvider, linkWithPopup } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ShieldCheck, Mail } from "lucide-react";

export default function Page() {
  const auth = getAuthService();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleClaimAccount = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(user, provider);
      setClaimed(true);
    } catch (error: any) {
      console.error("Failed to link account:", error);
      if (error.code === 'auth/credential-already-in-use') {
        alert("This Google account is already linked to another profile. Please sign in normally.");
      } else {
        alert(`System mismatch: ${error.message}`);
      }
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-bg">
        <Loader2 className="animate-spin text-brand-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-8 text-center p-10 bg-brand-bg text-brand-text">
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-500/5">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
          </div>
          <h2 className="text-5xl font-serif font-light text-brand-black italic">Thank You.</h2>
          <p className="text-brand-muted uppercase tracking-[0.4em] text-[10px] font-bold">Your session telemetry has been secured.</p>
        </div>

        {user?.isAnonymous && !claimed ? (
          <div className="max-w-md w-full p-10 border border-brand-line bg-brand-surface space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-brand-accent mb-2">
                <ShieldCheck size={14} />
                <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Secure Your Session</span>
              </div>
              <h3 className="font-serif text-xl text-brand-black">Claim Your Booking</h3>
              <p className="text-xs text-brand-muted leading-relaxed font-medium">
                You booked as a guest. To track your session, view progress, and receive your cinematic assets, link your booking to a permanent account now.
              </p>
            </div>

            <Button 
              onClick={handleClaimAccount}
              disabled={claiming}
              className="bg-brand-black text-white hover:bg-zinc-800 rounded-none w-full h-14 uppercase tracking-widest text-[10px] font-bold shadow-xl flex items-center justify-center gap-3"
            >
              {claiming ? <Loader2 className="animate-spin w-4 h-4" /> : (
                <>
                  <Mail className="w-4 h-4" />
                  Link with Google
                </>
              )}
            </Button>
            
            <p className="text-[9px] text-brand-muted uppercase font-bold tracking-widest pt-2">
              Encryption Protocol v2.4 Active
            </p>
          </div>
        ) : claimed ? (
          <div className="max-w-md w-full p-10 border border-emerald-500/20 bg-emerald-500/5 space-y-4 animate-in zoom-in-95 duration-500">
            <ShieldCheck className="mx-auto w-10 h-10 text-emerald-500" />
            <h3 className="font-serif text-xl text-brand-black">Identity Verified</h3>
            <p className="text-xs text-brand-muted font-medium">Your session has been successfully linked to your Google profile.</p>
          </div>
        ) : (
          <div className="max-w-md w-full p-10 border border-brand-line bg-brand-surface/50 space-y-2">
             <p className="text-xs text-brand-muted font-medium">Identity verified at {user?.email}</p>
             <p className="text-[9px] text-brand-black uppercase font-bold tracking-widest">Permanent Record Active</p>
          </div>
        )}

        <a 
          href="/" 
          className="text-[10px] uppercase font-bold tracking-[0.4em] border-b border-brand-accent pb-1 text-brand-black hover:text-brand-accent transition-colors mt-4"
        >
          Return Terminal
        </a>
    </div>
  );
}
