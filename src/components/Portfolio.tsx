'use client';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Facebook, Twitter, Pin, Instagram } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getDb, handleFirestoreError } from '../lib/firebase';

export function Portfolio() {
  const db = getDb();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(getDb(), 'portfolio_items'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list', 'portfolio_items');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const share = (platform: string, imgUrl: string) => {
    const pageUrl = window.location.href;
    const text = "Discover timeless frames at NowForeverMoods.";
    
    let url = "";
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'pinterest':
        url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&media=${encodeURIComponent(imgUrl)}&description=${encodeURIComponent(text)}`;
        break;
      case 'instagram':
        navigator.clipboard.writeText(`${text} ${pageUrl}`);
        alert("Link copied! Open Instagram to share.");
        url = `https://instagram.com`;
        break;
    }
    
    if (url) window.open(url, '_blank');
  };

  if (loading) {
    return <div className="h-96 flex items-center justify-center text-[10px] uppercase tracking-widest font-bold text-brand-muted">Loading Vault...</div>;
  }

  if (items.length === 0) {
    return <div className="py-24 text-center text-[10px] uppercase tracking-widest font-bold text-brand-muted bg-brand-surface border-y border-brand-line">No items in the archive yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-brand-bg px-4 md:px-0 mt-8">
      {items.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: (idx % 6) * 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative group aspect-[4/5] rounded-2xl overflow-hidden bg-brand-surface shadow-sm border border-brand-line"
        >
          {item.type === 'video' ? (
            <video 
              src={item.url} 
              className="object-cover w-full h-full transition-transform duration-[1.5s] ease-out group-hover:scale-105"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={item.url}
              alt={`Portfolio item ${idx + 1}`}
              className="object-cover w-full h-full transition-transform duration-[1.5s] ease-out group-hover:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-brand-black/0 group-hover:bg-brand-black/20 transition-colors duration-500" />
          
          {/* Top Right: Share Icons */}
          <div className="absolute top-6 right-6 flex flex-col gap-3 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
            <button 
              onClick={(e) => { e.stopPropagation(); share('facebook', item.url); }}
              className="w-10 h-10 rounded-full bg-white hover:bg-brand-accent hover:text-white text-brand-black flex items-center justify-center transition-colors shadow-md"
              title="Share on Facebook"
            >
              <Facebook size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); share('twitter', item.url); }}
              className="w-10 h-10 rounded-full bg-white hover:bg-brand-accent hover:text-white text-brand-black flex items-center justify-center transition-colors shadow-md"
              title="Share on Twitter"
            >
              <Twitter size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); share('pinterest', item.url); }}
              className="w-10 h-10 rounded-full bg-white hover:bg-brand-accent hover:text-white text-brand-black flex items-center justify-center transition-colors shadow-md"
              title="Pin on Pinterest"
            >
              <Pin size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); share('instagram', item.url); }}
              className="w-10 h-10 rounded-full bg-white hover:bg-brand-accent hover:text-white text-brand-black flex items-center justify-center transition-colors shadow-md"
              title="Share on Instagram"
            >
              <Instagram size={16} />
            </button>
          </div>

          <div className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-black bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">View Editorial</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
