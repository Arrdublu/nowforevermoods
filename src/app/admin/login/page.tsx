"use client";
import { useState, useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getAuthService, getDb } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const auth = getAuthService();
  const db = getDb();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().role === "admin") {
            router.push("/admin");
          } else if (
            user.email === "hi@arrdublu.us" ||
            user.email === "admin@nowforevermoods.com"
          ) {
            await setDoc(
              doc(db, "users", user.uid),
              { email: user.email, role: "admin" },
              { merge: true },
            );
            router.push("/admin");
          } else {
            // Not an admin, logout
            await signOut(auth);
            setError("Unauthorized access. Admin privileges required.");
            setLoading(false);
          }
        } catch (e) {
          setError("Failed to verify credentials.");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [auth, db, router]);

  const handleLogin = async () => {
    setError(null);
    setSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Let the onAuthStateChanged effect handle the redirect and role checking
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        console.error("Login failed", err?.message || String(err));
        setError(err.message || "Authentication failed. Please try again.");
      } else if (err.code === "auth/cancelled-popup-request" || err.code === "auth/popup-closed-by-user") {
        setError("Login popup closed. Note: If you are in a preview iframe, you may need to open this app in a new tab.");
      }
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg font-sans text-brand-text">
        <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-brand-muted animate-pulse">
          Checking credentials...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg px-4 font-sans text-brand-text">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-brand-line p-8 md:p-12 text-center"
      >
        <h1 className="text-3xl font-serif font-light mb-2 text-brand-black tracking-tight">
          Admin Terminal
        </h1>
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-muted mb-8">
          Restricted Access
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50/50 border border-red-100 text-red-600 text-sm">
            {error}
          </div>
        )}

        <Button
          onClick={handleLogin}
          disabled={signingIn}
          className="w-full bg-brand-black hover:bg-brand-ink text-white rounded-none py-6 uppercase tracking-widest text-xs font-bold"
        >
          {signingIn ? "Authenticating..." : "Sign in with Google"}
        </Button>
        <div className="mt-8">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-brand-muted hover:text-brand-black underline underline-offset-4 decoration-brand-line/50 transition-colors"
          >
            Return to Public Site
          </button>
        </div>
      </motion.div>
    </div>
  );
}
