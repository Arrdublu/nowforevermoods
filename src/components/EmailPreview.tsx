import React, { useEffect, useState } from "react";
import { getDb, getAuthService } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2, Mail } from "lucide-react";

export function EmailPreview({ type }: { type: 'order' | 'booking' }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuthService();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const db = getDb();
        const collectionName = type === 'order' ? 'orders' : 'bookings';
        
        let q = query(
          collection(db, collectionName),
          where("userId", "==", user.uid)
        );
        
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        
        // Filter paid items and sort by date since compound queries with inequality need composite indexes
        const paidItems = docs.filter(d => 
          (d.status === 'paid' || d.status === 'confirmed' || d.status === 'completed' || d.paymentStatus === 'paid')
        ).sort((a, b) => {
          const dateA = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        if (paidItems.length > 0) {
          setData(paidItems[0]);
        }
      } catch (err: any) {
        console.error("Error fetching data for email preview:", err?.message || String(err));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [type]);

  if (loading) {
    return (
      <div className="w-full h-32 flex items-center justify-center border border-brand-line bg-brand-surface/30 mt-8">
        <Loader2 className="animate-spin text-brand-muted w-5 h-5 mr-3" />
        <span className="text-xs uppercase tracking-widest text-brand-muted font-bold">Loading Email Preview...</span>
      </div>
    );
  }

  if (!data) return null;

  let emailSubject = "";
  let emailHtml = "";

  const amountPaid = data.amountTotal ? data.amountTotal : data.amount;
  const currencyStr = (data.currency || 'usd').toUpperCase();
  const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStr
  }).format(Number(amountPaid));

  if (type === 'order') {
    if (data.isDigital) {
        emailSubject = `Your NFM Digital Download: ${data.productName}`;
        emailHtml = `
            <h2>Thank you for your purchase from the NowForeverMoods Boutique!</h2>
            <p>You can download <strong>${data.productName}</strong> using the secure link below.</p>
            <a href="${data.downloadUrl || '#'}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;text-decoration:none;">Download Your Files</a>
        `;
    } else {
        emailSubject = `Your NFM Order Receipt: ${data.productName}`;
        emailHtml = `
            <h2>Thank you for your purchase!</h2>
            <p>Your order for <strong>${data.productName}</strong> has been received and is processing.</p>
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border: 1px solid #eee;">
                <h3 style="margin-top: 0;">Receipt of Payment</h3>
                <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
                <p><strong>Item:</strong> ${data.productName}</p>
            </div>
            <p>We will notify you once it ships.</p>
            <p>— Now Forever Moods</p>
        `;
    }
  } else {
    // booking
    if (data.packageId === 'beauty-architecture') {
        emailSubject = `Beauty Architecture Initiation: Welcome & Next Steps`;
        emailHtml = `
            <h2>Welcome to Beauty Architecture</h2>
            <p>Hi ${data.userName || 'Client'},</p>
            <p>Your payment has been successfully processed and your initiation into Beauty Architecture is confirmed.</p>
            <h3>Step 1: The Blueprint Questionnaire</h3>
            <p>To begin our journey, please complete your detailed creative blueprint. This allows us to understand your aesthetic core before our first session.</p>
            <p><a href="https://nowforevermoods.com/blueprint" style="display: inline-block; padding: 10px 20px; background-color: #111; color: #fff; text-decoration: none; border-radius: 4px;">Complete Questionnaire</a></p>
            <h3>What happens next?</h3>
            <p>Once you submit your blueprint, we will review it and follow up within 48 hours to schedule our first direct consultation. We look forward to building with you.</p>
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border: 1px solid #eee;">
                <h3 style="margin-top: 0;">Receipt of Payment</h3>
                <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
                <p><strong>Package:</strong> ${data.packageName}</p>
            </div>
            <p>— Now Forever Moods</p>
        `;
    } else {
        emailSubject = `Session Confirmed: ${data.packageName || 'Photography Session'}`;
        emailHtml = `
            <h2>Your Session is Confirmed</h2>
            <p>Hi ${data.userName || 'there'},</p>
            <p>Thank you for booking with us! Your payment has been received and your session is confirmed.</p>
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border: 1px solid #eee;">
                <h3 style="margin-top: 0;">Receipt of Payment</h3>
                <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
                <p><strong>Package:</strong> ${data.packageName}</p>
            </div>
            <h3>Next Steps</h3>
            <p>We will be in touch shortly to coordinate exact timing, styling, and location details if we haven't already.</p>
            <p>We're excited to create something beautiful together!</p>
            <p>— Now Forever Moods</p>
        `;
    }
  }

  return (
    <div className="w-full mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2 mb-3 px-2">
        <Mail className="w-4 h-4 text-brand-muted" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-black">Email Receipt Preview</h3>
      </div>
      <div className="border border-brand-line bg-white shadow-xl overflow-hidden rounded-md text-left">
        <div className="bg-zinc-100 border-b border-brand-line px-4 py-3 text-xs flex flex-col gap-1">
          <div className="flex text-zinc-500">
            <span className="w-16 inline-block font-semibold">From:</span>
            <span>hello@nowforevermoods.com</span>
          </div>
          <div className="flex text-zinc-500">
            <span className="w-16 inline-block font-semibold">To:</span>
            <span>{data.userEmail || 'Client'}</span>
          </div>
          <div className="flex text-zinc-800 font-medium">
            <span className="w-16 inline-block font-semibold text-zinc-500">Subject:</span>
            <span>{emailSubject}</span>
          </div>
        </div>
        <div className="p-6 md:p-8 bg-white font-sans text-sm outline-none" dangerouslySetInnerHTML={{ __html: emailHtml }} />
      </div>
      <p className="text-[10px] text-brand-muted mt-4 text-center">
        This is a live preview of the digital receipt sent to your email address.
      </p>
    </div>
  );
}
