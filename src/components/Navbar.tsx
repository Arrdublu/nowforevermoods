'use client';
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAuthService } from "../lib/firebase";
import { useGeoPricing } from "../hooks/useGeoPricing";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { User as UserIcon, Menu, X, ChevronDown } from "lucide-react";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { getDb, handleFirestoreError } from "../lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function Navbar() {
  const db = getDb();
  const auth = getAuthService();
  const { currency, toggleCurrency } = useGeoPricing();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCollectionsDropdownOpen, setIsCollectionsDropdownOpen] = useState(false);
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  const navBg = useTransform(scrollY, [0, 100], isHomePage ? ["rgba(245, 242, 237, 0)", "rgba(245, 242, 237, 0.95)"] : ["rgba(245, 242, 237, 0.95)", "rgba(245, 242, 237, 0.95)"]);
  const navTextColor = useTransform(scrollY, [0, 100], isHomePage ? ["#FFFFFF", "#1a1a1a"] : ["#1a1a1a", "#1a1a1a"]);
  const borderOpacity = useTransform(scrollY, [0, 100], isHomePage ? ["rgba(26, 26, 26, 0)", "rgba(26, 26, 26, 0.1)"] : ["rgba(26, 26, 26, 0.1)", "rgba(26, 26, 26, 0.1)"]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        try {
          // Sync user profile and check admin
          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          if (!userDoc.exists()) {
            const role = (authUser.email === 'hi@arrdublu.us' || authUser.email === 'admin@nowforevermoods.com') ? 'admin' : 'user';
            await setDoc(doc(db, "users", authUser.uid), {
              userId: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              role: role,
              createdAt: new Date(),
            });
            setIsAdmin(role === 'admin');
          } else {
            setIsAdmin(userDoc.data().role === 'admin');
          }
        } catch (error: any) {
          if (error?.message?.includes("client is offline") || error?.message?.includes("network-request-failed")) {
            console.warn("Offline error during role check, skipping.", error);
            setIsAdmin(false);
          } else {
            handleFirestoreError(error, 'get', `users/${authUser.uid}`);
          }
        }
      } else {
        setIsAdmin(false);
      }
    });
    return unsub;
  }, [auth, db]);

  const executeGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setIsLoginModalOpen(false);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        handleFirestoreError(error, 'get' as any, 'auth/popup-login');
      }
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        alert("The authentication popup was blocked or closed. Because this preview runs in a secure iframe, cross-origin popups can be restricted by your browser. Please pop this preview out into a new tab (top right icon) and try again.");
      } else {
        alert(`Sign in error: ${error.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => signOut(auth);

  return (
    <motion.nav 
      style={{ backgroundColor: navBg, borderBottomColor: borderOpacity }}
      className="fixed top-0 left-0 right-0 z-50 transition-colors border-b border-transparent px-8 h-24 flex items-center justify-between backdrop-blur-lg"
    >
      <Link href="/" className="flex flex-col">
        <motion.span style={{ color: navTextColor }} className="font-serif text-2xl tracking-[0.2em] uppercase font-light">NowForeverMoods</motion.span>
        <span className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] font-bold text-brand-accent mt-1 leading-none transition-all">A Collective by Arrdublu (Production) & Ioka (Beauty)</span>
      </Link>

      {/* Desktop Nav */}
      <motion.div style={{ color: navTextColor }} className="hidden md:flex items-center gap-8">
        <Link href="/" className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-colors pb-1 border-b ${pathname === '/' ? 'opacity-100 border-current' : 'opacity-80 hover:opacity-100 border-transparent hover:border-current/50'}`}>Portfolio</Link>
        
        {/* Collections Dropdown */}
        <div 
          className="relative h-full flex items-center group cursor-pointer"
          onMouseEnter={() => setIsCollectionsDropdownOpen(true)}
          onMouseLeave={() => setIsCollectionsDropdownOpen(false)}
        >
          <button 
            type="button"
            className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors pb-1 border-b select-none ${
              (pathname === '/packages' || pathname === '/balance') ? 'opacity-100 border-current' : 'opacity-80 hover:opacity-100 border-transparent hover:border-current/50'
            }`}
          >
            <span>Collections</span>
            <ChevronDown size={10} className="opacity-60 transition-transform duration-200 group-hover:rotate-180" />
          </button>
          
          <AnimatePresence>
            {isCollectionsDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full -mt-2 w-48 bg-[#f5f2ed] border border-stone-200/80 shadow-xl py-2 backdrop-blur-md flex flex-col z-50 text-stone-900"
              >
                <Link 
                  href="/packages"
                  className={`text-[9px] uppercase tracking-[0.2em] font-bold px-4 py-2.5 transition-colors text-left border-l-2 ${
                    pathname === '/packages' ? 'border-brand-accent text-brand-accent bg-stone-100/40' : 'border-transparent text-stone-700 hover:text-stone-950 hover:bg-stone-100/30'
                  }`}
                >
                  Experience Tiers
                </Link>
                <Link 
                  href="/balance"
                  className={`text-[9px] uppercase tracking-[0.2em] font-bold px-4 py-2.5 transition-colors text-left border-l-2 ${
                    pathname === '/balance' ? 'border-brand-accent text-brand-accent bg-stone-100/40' : 'border-transparent text-stone-700 hover:text-stone-950 hover:bg-stone-100/30'
                  }`}
                >
                  Final Balance
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link href="/boutique" className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-colors pb-1 border-b ${pathname.startsWith('/boutique') ? 'opacity-100 border-current' : 'opacity-80 hover:opacity-100 border-transparent hover:border-current/50'}`}>Boutique</Link>
        <Link href="/beauty-architecture" className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-colors pb-1 border-b ${pathname === '/beauty-architecture' ? 'opacity-100 border-current' : 'opacity-80 hover:opacity-100 border-transparent hover:border-current/50'}`}>Beauty Architecture</Link>
        {isAdmin && (
          <Link href="/admin" className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-colors pb-1 border-b ${pathname === '/admin' ? 'text-brand-accent border-current' : 'text-brand-accent/80 hover:text-brand-accent border-transparent hover:border-current/50'}`}>Admin Dashboard</Link>
        )}
        {user && (
          <Link href="/dashboard" className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-colors pb-1 border-b ${pathname === '/dashboard' ? 'opacity-100 border-current' : 'opacity-80 hover:opacity-100 border-transparent hover:border-current/50'}`}>My Dashboard</Link>
        )}
        
        <div className="flex items-center gap-6 ml-4">
          <button 
            onClick={toggleCurrency}
            className="group flex items-center space-x-4 bg-brand-surface/30 px-4 py-2 rounded-full border border-brand-line/20 backdrop-blur-sm hover:bg-brand-surface transition-all active:scale-95"
          >
            <span className="text-[9px] uppercase font-bold tracking-tighter opacity-60 group-hover:opacity-100 transition-opacity">Override</span>
            <div className="flex items-center gap-1.5 font-bold">
              <span className={`text-[10px] tracking-tight ${currency === 'JMD' ? 'text-brand-accent' : 'opacity-40'}`}>JMD</span>
              <div className="w-px h-3 bg-brand-line/30" />
              <span className={`text-[10px] tracking-tight ${currency === 'USD' ? 'text-brand-accent' : 'opacity-40'}`}>USD</span>
            </div>
          </button>

          {user ? (
            <div className="flex items-center gap-4 border-l border-brand-line/20 pl-6">
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">{user.displayName?.split(' ')[0]}</span>
              <Button variant="ghost" className="p-0 text-[10px] uppercase tracking-widest font-bold hover:bg-transparent opacity-100 hover:text-brand-accent transition-colors" onClick={logout}>Sign Out</Button>
            </div>
          ) : (
            <div className="border-l border-brand-line/20 pl-6">
              <Button variant="ghost" className="p-0 text-[10px] uppercase tracking-widest font-bold hover:bg-transparent opacity-100 hover:text-brand-accent transition-colors" onClick={() => setIsLoginModalOpen(true)}>Sign In</Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Mobile Toggle */}
      <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-zinc-900 flex flex-col p-8 gap-6 md:hidden"
        >
          <Link href="/" onClick={() => setIsMenuOpen(false)} className={`text-xs uppercase tracking-widest ${pathname === '/' ? 'opacity-100 font-bold' : 'opacity-70'}`}>Portfolio</Link>
          
          {/* Collections Mobile Section */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-stone-400">Collections</span>
            <div className="pl-4 flex flex-col gap-3 mt-1">
              <Link href="/packages" onClick={() => setIsMenuOpen(false)} className={`text-xs uppercase tracking-widest ${pathname === '/packages' ? 'text-brand-accent font-bold' : 'opacity-70'}`}>Experience Tiers</Link>
              <Link href="/balance" onClick={() => setIsMenuOpen(false)} className={`text-xs uppercase tracking-widest ${pathname === '/balance' ? 'text-brand-accent font-bold' : 'opacity-70'}`}>Final Balance</Link>
            </div>
          </div>

          <Link href="/boutique" onClick={() => setIsMenuOpen(false)} className={`text-xs uppercase tracking-widest text-brand-accent ${pathname.startsWith('/boutique') ? 'opacity-100 font-bold' : 'opacity-70'}`}>Boutique</Link>
          <Link href="/beauty-architecture" onClick={() => setIsMenuOpen(false)} className={`text-xs uppercase tracking-widest ${pathname === '/beauty-architecture' ? 'opacity-100 font-bold' : 'opacity-70'}`}>Beauty Architecture</Link>
          {isAdmin && <Link href="/admin" onClick={() => setIsMenuOpen(false)} className={`text-xs uppercase tracking-widest text-emerald-500 font-bold ${pathname === '/admin' ? 'opacity-100' : 'opacity-70'}`}>Admin Dashboard</Link>}
          {user && (
            <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className={`text-xs uppercase tracking-widest ${pathname === '/dashboard' ? 'opacity-100 font-bold' : 'opacity-70'}`}>My Dashboard</Link>
          )}
          <hr className="border-zinc-900" />
          {user ? (
            <Button onClick={logout} className="rounded-none bg-zinc-900 text-xs">Sign Out</Button>
          ) : (
            <Button onClick={() => setIsLoginModalOpen(true)} className="rounded-none bg-white text-black text-xs">Sign In</Button>
          )}
        </motion.div>
      )}

      {/* Auth Modal */}
      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="rounded-none border-brand-line max-w-md bg-brand-bg md:p-12 p-8">
          <DialogHeader className="text-center md:text-left space-y-4">
            <div className="mx-auto md:mx-0 w-12 h-12 border border-brand-line flex items-center justify-center bg-brand-surface mb-2">
              <UserIcon size={20} className="text-brand-accent" />
            </div>
            <DialogTitle className="text-3xl font-serif tracking-tight text-brand-black">Authentication</DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-[0.2em] font-bold leading-relaxed text-brand-muted">
              Connect to your terminal session. If approved, admin privileges will automatically sync to your user configuration.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-8 space-y-6">
            <Button 
              onClick={executeGoogleLogin} 
              disabled={isLoggingIn}
              className="w-full h-12 rounded-none bg-brand-black hover:bg-zinc-800 text-white text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-3"
            >
              {isLoggingIn ? 'Syncing...' : 'Continue with Google Account'}
            </Button>

            <p className="text-center text-[10px] text-brand-muted leading-relaxed font-medium">
              By authenticating, you agree to the NowForeverMoods collective<br/>
              <Link href="/terms" onClick={() => setIsLoginModalOpen(false)} className="underline hover:text-brand-black mr-2">Terms of Service</Link> 
              and 
              <Link href="/privacy" onClick={() => setIsLoginModalOpen(false)} className="underline hover:text-brand-black ml-2">Privacy Directive</Link>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </motion.nav>
  );
}
