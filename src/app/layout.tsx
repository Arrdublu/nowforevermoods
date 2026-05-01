import type { Metadata } from "next";
import { Montserrat, Cormorant_Garamond } from 'next/font/google';
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "NowForeverMoods",
  description: "Cinematic Experiences",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${cormorant.variable}`}>
      <body className="bg-brand-bg text-brand-text selection:bg-brand-accent selection:text-white">
          <Navbar />
          {children}
          <footer className="h-24 md:h-20 bg-brand-bg text-brand-text border-t border-brand-line flex flex-col md:flex-row items-center justify-between px-8 md:px-12 py-6 md:py-0 relative z-10 w-full overflow-hidden">
            {/* ... footer content ... */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:space-x-8 text-center md:text-left">
              <div className="flex flex-col">
                <span className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold text-brand-black">NowForeverMoods</span>
                <span className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-bold text-brand-accent mt-0.5">A Collective by Arrdublu (Production) & Ioka (Beauty)</span>
              </div>
              <div className="flex justify-center md:justify-start space-x-6 text-[9px] uppercase tracking-[0.2em] font-bold">
                <a href="/terms" className="hover:text-brand-accent transition-colors">Terms</a>
                <a href="/privacy" className="hover:text-brand-accent transition-colors">Privacy</a>
                <a href="/support" className="hover:text-brand-accent transition-colors">Support</a>
              </div>
            </div>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
               <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 font-bold hidden md:inline text-right italic leading-relaxed text-brand-muted">Managed via Arrdublu Infrastructure<br/>Florida & Jamaica Bureaus</span>
               <div className="flex items-center gap-2 border-l border-brand-line pl-6">
                <span className="text-[10px] uppercase tracking-widest opacity-80 font-bold text-brand-black">Terminal Status</span>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-slow"></div>
               </div>
            </div>
          </footer>
      </body>
    </html>
  );
}
