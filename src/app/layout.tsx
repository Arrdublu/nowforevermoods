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
  metadataBase: new URL('https://nowforevermoods.com'),
  title: {
    default: 'NowForeverMoods | A Collective by Arrdublu & Ioka',
    template: '%s | NowForeverMoods',
  },
  description: 'A high-fidelity fusion of editorial cinematography and professional makeup artistry.',
  openGraph: {
    title: 'NowForeverMoods Collective',
    description: 'Visual Legacy Captured. Defining modern luxury across the Caribbean.',
    url: 'https://nowforevermoods.com',
    siteName: 'NowForeverMoods',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'NowForeverMoods Cinematic Artistry',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NowForeverMoods Collective',
    description: 'Visual Legacy Captured. A private luxury creative suite.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${cormorant.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
if (typeof window !== 'undefined') {
  const methods = ['log', 'warn', 'error', 'info', 'debug'];
  // Keep native reference if available
  const nativeLog = console._log || console.log;
  methods.forEach(method => {
    const original = console[method];
    if (original) {
      console[method] = function (...args) {
        const safeArgs = args.map(arg => {
          if (arg instanceof Error) {
            return { message: arg.message, stack: arg.stack, name: arg.name };
          }
          if (arg && typeof arg === 'object') {
            try {
              // Deeply checking constructors to avoid any circular structure in AI Studio's logger
              if (
                 arg.constructor && 
                 (arg.constructor.name === 'Y' || 
                  arg.constructor.name === 'Ka' || 
                  arg.constructor.name === 'Firestore' || 
                  arg.constructor.name === 'FirebaseError')
              ) {
                return '[Suppressed Firebase Object]';
              }
              // Return a safely shallow-serialized version or suppress to prevent stringify crash
              return "[Complex Object Suppressed]";
            } catch (e) {
              return "[Complex Object Suppressed]";
            }
          }
          return arg;
        });
        try {
          original.apply(console, safeArgs);
        } catch (innerErr) {
          // If the AI Studio logger or Next.js overlay still throws 
          // (e.g. converting circular structure to JSON), catch it and log safely
        }
      };
    }
  });
}
`
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WMJK5S48');`
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '994323009678320');
fbq('track', 'PageView');`
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=994323009678320&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body className="bg-brand-bg text-brand-text selection:bg-brand-accent selection:text-white">
        <noscript>
          <iframe 
            src="https://www.googletagmanager.com/ns.html?id=GTM-WMJK5S48"
            height="0" 
            width="0" 
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
          <Navbar />
          {children}
          <footer className="h-24 md:h-20 bg-brand-bg text-brand-text border-t border-brand-line flex flex-col md:flex-row items-center justify-between px-8 md:px-12 py-6 md:py-0 relative z-10 w-full overflow-hidden">
            {/* ... footer content ... */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:space-x-8 text-center md:text-left">
              <div className="flex flex-col">
                <span className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold text-brand-black">NowForeverMoods <span className="opacity-20 text-[8px] lowercase tracking-normal">Build 2026.05.11</span></span>
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
