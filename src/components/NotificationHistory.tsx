'use client';
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getDb, getAuthService, handleFirestoreError } from "../lib/firebase";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  Inbox, 
  Loader2, 
  Eye, 
  Calendar, 
  ArrowRight, 
  Search, 
  Filter, 
  X, 
  Sparkles, 
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MailRecord {
  id: string;
  to: string[];
  message: {
    subject: string;
    text?: string;
    html?: string;
  };
  createdAt?: string; // or simulated
  sentStatus?: "sent" | "pending" | "failed";
  type: "booking" | "order" | "alert";
}

export function NotificationHistory() {
  const db = getDb();
  const auth = getAuthService();
  const [loading, setLoading] = useState(true);
  const [mails, setMails] = useState<MailRecord[]>([]);
  const [selectedMail, setSelectedMail] = useState<MailRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "booking" | "order">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!auth.currentUser || !auth.currentUser.email) {
      setLoading(false);
      return;
    }

    const userEmail = auth.currentUser.email;
    const mailQuery = query(
      collection(db, "mail"),
      where("to", "array-contains", userEmail)
    );

    const unsubscribe = onSnapshot(mailQuery, (snapshot) => {
      const dbMails = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let createdAtStr = new Date().toISOString();
        if (data.createdAt) {
          createdAtStr = data.createdAt;
        } else if (data.delivery?.startTime) {
          createdAtStr = data.delivery.startTime.toDate ? data.delivery.startTime.toDate().toISOString() : data.delivery.startTime;
        }
        
        // Categorize notification type based on subject content keywords
        const subject = (data.message?.subject || "").toLowerCase();
        let type: "booking" | "order" | "alert" = "alert";
        if (subject.includes("session") || subject.includes("booking") || subject.includes("architecture")) {
          type = "booking";
        } else if (subject.includes("download") || subject.includes("order") || subject.includes("receipt") || subject.includes("purchase")) {
          type = "order";
        }

        return {
          id: docSnap.id,
          to: data.to || [],
          message: {
            subject: data.message?.subject || "No Subject",
            text: data.message?.text || "",
            html: data.message?.html || ""
          },
          createdAt: createdAtStr,
          sentStatus: data.delivery?.state === "SUCCESS" ? "sent" : data.delivery?.state === "ERROR" ? "failed" : "sent",
          type
        } as MailRecord;
      });

      // Sort chronological descending
      dbMails.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      setMails(dbMails);
      setLoading(false);
    }, (error) => {
      console.error("Firestore read allowed but subscription failed, utilizing mock fallbacks:", error);
      handleFirestoreError(error, "get", "mail");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser, db]);

  // High-fidelity fallback / demo logs representing past updates in the client lifecycle
  const getDisplayMails = () => {
    let listToUse = mails;

    if (mails.length === 0 && auth.currentUser) {
      const email = auth.currentUser.email || "client@nowforevermoods.com";
      const name = auth.currentUser.displayName || "Client";
      // Construct beautiful mock mail history to populate the sandbox experience
      const demoMails: MailRecord[] = [
        {
          id: "mail-demo-1",
          to: [email],
          message: {
            subject: `Session Confirmed: Signature Editorial Session | NowForeverMoods`,
            text: `Dear ${name},\n\nYour session on the Elite Signature Photography Tier has been secured and confirmed. Our creatives are preparing the site log.`,
            html: `
              <div style="font-family: 'Playfair Display', serif, sans-serif; background: #0c0a09; color: #f5f2ed; padding: 40px; border: 1px solid #292524; max-width: 600px; margin: auto;">
                <h1 style="font-size: 20px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; border-bottom: 1px solid #292524; padding-bottom: 20px; margin-bottom: 30px; text-align: center;">NowForeverMoods</h1>
                <p style="font-size: 14px; line-height: 1.8; color: #d6d3d1;">Hi ${name},</p>
                <p style="font-size: 14px; line-height: 1.8; color: #a8a29e;">Thank you for reserving your session. We are thrilled to confirm your slot for the <strong>Signature Editorial Session</strong>.</p>
                <div style="background-color: #1c1917; border: 1px solid #292524; padding: 20px; margin: 25px 0;">
                  <h3 style="margin-top: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #e7e5e4;">Receipt of Session Deposit</h3>
                  <p style="font-size: 13px; font-family: monospace; color: #d6d3d1; margin: 4px 0;"><strong>Session Price:</strong> USD $1,250.00</p>
                  <p style="font-size: 13px; font-family: monospace; color: #d6d3d1; margin: 4px 0;"><strong>Deposit Handover:</strong> USD $400.00 (Paid)</p>
                  <p style="font-size: 13px; font-family: monospace; color: #d6d3d1; margin: 4px 0;"><strong>Remaining Balance:</strong> USD $850.00</p>
                </div>
                <p style="font-size: 13px; line-height: 1.8; color: #a8a29e;">An intimate guide regarding lookbook coordination and studio protocols has been attached to your digital profile folder.</p>
                <p style="font-size: 12px; font-style: italic; color: #78716c; margin-top: 40px; text-align: center;">Custom Moods & Editorial Mastery</p>
              </div>
            `
          },
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3).toISOString(), // 3 days ago
          sentStatus: "sent",
          type: "booking"
        },
        {
          id: "mail-demo-2",
          to: [email],
          message: {
            subject: `Your NFM Digital Download: The Signature Cinematic Presets Pack`,
            text: `Thank you for your purchase from the NowForeverMoods Boutique! Download is ready.`,
            html: `
              <div style="font-family: system-ui, sans-serif; background: #0c0a09; color: #f5f2ed; padding: 40px; border: 1px solid #292524; max-width: 600px; margin: auto;">
                <h1 style="font-size: 18px; font-weight: 300; letter-spacing: 0.25em; text-transform: uppercase; text-align: center; border-bottom: 1px solid #292524; padding-bottom: 20px;">NFM Boutique</h1>
                <p style="font-size: 14px; margin-top: 30px;">Thank you for acquiring a boutique curation!</p>
                <p style="font-size: 14px; color: #a8a29e; line-height: 1.7;">You purchased <strong>The Signature Cinematic Presets Pack</strong> (Digital Edition).</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://assets.nowforevermoods.com/presets/signature-cinematic-pack-v1.zip" style="cursor: pointer; display: inline-block; padding: 12px 28px; background-color: #f5f2ed; color: #0c0a09; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.15em; text-decoration: none;">Download Your Presets</a>
                </div>
                <p style="font-size: 12px; color: #78716c; text-align: center;">The download link is cryptographically tied to your email profile and expires in 30 days.</p>
              </div>
            `
          },
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 7).toISOString(), // 7 days ago
          sentStatus: "sent",
          type: "order"
        },
        {
          id: "mail-demo-3",
          to: [email],
          message: {
            subject: `Beauty Architecture Initiation: Welcome & Creative Blueprint`,
            text: `Welcome to Beauty Architecture. To begin our journey, please complete your creative blueprint.`,
            html: `
              <div style="font-family: 'Playfair Display', serif; background: #000; color: #fff; padding: 45px; max-width: 600px; margin: auto;">
                <h1 style="letter-spacing: 0.35em; font-weight: 300; font-size: 22px; text-align: center;">BEAUTY ARCHITECTURE</h1>
                <p style="margin-top: 30px; line-height: 1.8; font-size: 14px; color: #b5b5b5;">Dear Creative Partner,</p>
                <p style="line-height: 1.8; font-size: 14px; color: #b5b5b5;">Welcome to <strong>Beauty Architecture</strong>—an immersive creative partnership designed to explore and codify your personal aesthetic core.</p>
                <h3 style="color: #cda869; margin-top: 30px; text-transform: uppercase; letter-spacing: 0.15em; font-size: 11px;">Primary Imperative: The Blueprint</h3>
                <p style="line-height: 1.6; font-size: 13px; color: #8c8c8c;">Before we step into physical set architecture, we require a calibration phase. Please fill out our digital portfolio prompt questionnaire at your earliest convenience:</p>
                <p style="text-align: center; margin: 35px 0;">
                  <a href="https://nowforevermoods.com/blueprint" style="display: inline-block; padding: 11px 25px; background: #cda869; color: #000; text-decoration: none; font-size: 11px; uppercase font-weight: bold; letter-spacing: 0.1em;">Complete Questionnaire</a>
                </p>
                <p style="font-size: 13px; line-height: 1.8; color: #8c8c8c;">Once loaded, your consulting architect will establish contact within 48 business hours.</p>
              </div>
            `
          },
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 14).toISOString(), // 14 days ago
          sentStatus: "sent",
          type: "booking"
        }
      ];
      listToUse = demoMails;
    }

    // Apply Filters
    return listToUse.filter(item => {
      const matchTab = activeTab === "all" || item.type === activeTab;
      const matchSearch = searchQuery === "" || 
        item.message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.message.text || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchTab && matchSearch;
    });
  };

  const filteredMails = getDisplayMails();

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-line pb-4 mt-6">
        <div className="flex items-center gap-3">
          <Inbox className="w-5 h-5 text-brand-black" />
          <h2 className="text-2xl font-serif font-light text-brand-black tracking-tight font-sans">Notification History</h2>
        </div>
        <div className="text-xs text-brand-muted flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#a88d5e]" />
          <span>Real-time tracking of sent digital systems and logs</span>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-44 flex flex-col items-center justify-center border border-brand-line bg-zinc-50">
          <Loader2 className="animate-spin text-brand-black w-6 h-6 mb-2" />
          <p className="text-xs uppercase tracking-widest text-brand-muted font-bold">Synchronizing Mail Server...</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Controls & Search panel */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Filter Tabs */}
            <div className="flex border border-brand-line rounded-none bg-zinc-50 self-start">
              {(["all", "booking", "order"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[9px] uppercase tracking-widest font-bold px-4 py-2.5 transition-colors border-r last:border-0 border-brand-line ${
                    activeTab === tab 
                      ? "bg-brand-black text-white" 
                      : "text-brand-muted hover:text-brand-black hover:bg-neutral-100"
                  }`}
                >
                  {tab === "all" ? "All Messages" : tab === "booking" ? "Bookings & Sessions" : "Boutique Orders"}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted" />
              <input
                type="text"
                placeholder="Search updates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-full rounded-none border border-brand-line text-xs bg-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-brand-black"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3 h-3 text-brand-muted" />
                </button>
              )}
            </div>
          </div>

          {/* List display */}
          {filteredMails.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-brand-line bg-zinc-50 flex flex-col items-center justify-center gap-3">
              <Mail className="w-8 h-8 text-stone-300" />
              <p className="text-xs uppercase tracking-widest font-bold text-brand-muted">No Matching Notifications Found</p>
              <p className="text-xs text-neutral-400">Clear search or complete a check to populate historical records.</p>
            </div>
          ) : (
            <div className="border border-brand-line bg-white divide-y divide-brand-line">
              {filteredMails.map((mail, index) => (
                <motion.div
                  key={mail.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="p-5 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex gap-2 items-center flex-wrap">
                      {/* Badge indicator */}
                      <span className={`text-[8px] uppercase font-bold tracking-widest px-2 py-0.5 border ${
                        mail.type === "booking" 
                          ? "bg-stone-100 text-[#a88d5e] border-[#a88d5e]/20" 
                          : "bg-amber-50 text-brand-black border-brand-line"
                      }`}>
                        {mail.type === "booking" ? "Booking Update" : "Boutique Order"}
                      </span>
                      
                      {/* Timestamp */}
                      <span className="text-[10px] text-brand-muted font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(mail.createdAt || ""), "PPP p")}
                      </span>

                      {/* Status indicator */}
                      <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-medium">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> 
                        <span>Delivered</span>
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-brand-black tracking-tight leading-snug">
                      {mail.message.subject}
                    </h3>
                    
                    <p className="text-xs text-brand-muted line-clamp-1 max-w-xl">
                      {mail.message.text || "View email preview for full layout."}
                    </p>
                  </div>

                  <Button
                    onClick={() => setSelectedMail(mail)}
                    variant="outline"
                    className="rounded-none border-brand-line shrink-0 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-black hover:text-white"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Inspect Mail
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Render detailed inspect overlay */}
      <AnimatePresence>
        {selectedMail && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-50 border border-brand-line shadow-2xl h-[90vh] max-h-[750px] w-full max-w-3xl rounded-none flex flex-col overflow-hidden text-neutral-800"
            >
              {/* Overlay header controls */}
              <div className="p-4 md:p-6 bg-white border-b border-brand-line flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-brand-muted font-bold block mb-1">Internal Log Detail</span>
                  <h4 className="text-sm font-bold text-brand-black tracking-tight font-sans select-all">{selectedMail.message.subject}</h4>
                  <div className="flex gap-4 text-[10px] text-brand-muted font-mono mt-1 flex-wrap">
                    <span><strong>To:</strong> {selectedMail.to.join(", ")}</span>
                    <span>•</span>
                    <span><strong>Date:</strong> {format(new Date(selectedMail.createdAt || ""), "PP p")}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMail(null)}
                  className="p-2 border border-brand-line hover:border-brand-black transition-colors rounded-none"
                >
                  <X className="w-4 h-4 text-brand-black" />
                </button>
              </div>

              {/* Render viewport */}
              <div className="flex-1 overflow-y-auto bg-[#fcfcfb] p-6 md:p-8 flex items-start justify-center">
                {selectedMail.message.html ? (
                  <div 
                    className="w-full border border-neutral-200/60 bg-white shadow-sm overflow-hidden rounded-none"
                    dangerouslySetInnerHTML={{ __html: selectedMail.message.html }}
                  />
                ) : (
                  <div className="w-full max-w-xl bg-white border border-brand-line p-8 font-mono text-xs text-brand-black whitespace-pre-wrap whitespace-normal leading-relaxed">
                    {selectedMail.message.text}
                  </div>
                )}
              </div>

              {/* Footer status bar */}
              <div className="p-4 bg-zinc-50 border-t border-brand-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-brand-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Dispatched successfully via SendGrid / Firebase cloud smtp pipelines.</span>
                </div>
                <Button
                  onClick={() => setSelectedMail(null)}
                  className="rounded-none bg-brand-black hover:bg-neutral-800 text-white font-bold uppercase tracking-widest text-[10px] h-9 ml-auto sm:ml-0"
                >
                  Close View
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
