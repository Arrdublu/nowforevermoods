'use client';
import { useState } from "react";
import { UserBookings } from "@/components/UserBookings";
import { UserOrders } from "@/components/UserOrders";
import { OrderTracking } from "@/components/OrderTracking";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { NotificationHistory } from "@/components/NotificationHistory";
import { Calendar, ShoppingBag, BellRing, Sparkles } from "lucide-react";

type DashboardTab = "bookings" | "orders" | "notifications";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("bookings");
  const [trackingOrderId, setTrackingOrderId] = useState<string>("");

  return (
    <div className="pt-32 p-8 md:p-16 max-w-7xl mx-auto space-y-10">
      
      {/* Dashboard Headline Hero */}
      <div className="border-b border-brand-line pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-[#a88d5e]">NFM Client Suite</span>
          <h1 className="text-4xl font-serif font-light text-brand-black tracking-tight">User Dashboard</h1>
          <p className="text-sm text-brand-muted max-w-2xl">
            Curate and review your active studio bookings, download digital boutique purchases, and inspect delivery notification streams.
          </p>
        </div>
        
        <div className="hidden lg:flex items-center gap-2 border border-brand-line px-4 py-2.5 bg-zinc-50/50">
          <Sparkles className="w-4 h-4 text-[#a88d5e]" />
          <span className="text-[10px] uppercase tracking-widest font-mono text-brand-muted">Secure Access Connection</span>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-brand-line gap-6 md:gap-10 overflow-x-auto scrollbar-none select-none">
        
        {/* Bookings Tab Button */}
        <button
          type="button"
          onClick={() => setActiveTab("bookings")}
          className={`flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all duration-200 -mb-[1px] whitespace-nowrap outline-none ${
            activeTab === "bookings"
              ? "border-brand-black text-brand-black font-extrabold"
              : "border-transparent text-brand-muted hover:text-brand-black"
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0 opacity-80" />
          <span>Bookings & Sessions</span>
        </button>

        {/* Orders Tab Button */}
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all duration-200 -mb-[1px] whitespace-nowrap outline-none ${
            activeTab === "orders"
              ? "border-brand-black text-brand-black font-extrabold"
              : "border-transparent text-brand-muted hover:text-brand-black"
          }`}
        >
          <ShoppingBag className="w-4 h-4 shrink-0 opacity-80" />
          <span>Boutique Orders</span>
        </button>

        {/* Notifications Tab Button */}
        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all duration-200 -mb-[1px] whitespace-nowrap outline-none ${
            activeTab === "notifications"
              ? "border-brand-black text-brand-black font-extrabold"
              : "border-transparent text-brand-muted hover:text-brand-black"
          }`}
        >
          <BellRing className="w-4 h-4 shrink-0 opacity-80" />
          <span>Notification Center</span>
        </button>

      </div>

      {/* Main Tab Viewports */}
      <div className="space-y-4 min-h-[400px]">
        {activeTab === "bookings" && (
          <div className="animate-in fade-in duration-300">
            <UserBookings />
          </div>
        )}

        {activeTab === "orders" && (
          <div className="animate-in fade-in duration-300 space-y-12">
            <UserOrders onTrackOrder={(orderId) => {
              setTrackingOrderId(orderId);
              // Wait slightly for DOM render, then scroll cleanly
              setTimeout(() => {
                const element = document.getElementById("order-tracking-viewport");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }, 100);
            }} />

            <div id="order-tracking-viewport" className="pt-4 scroll-mt-24">
              <OrderTracking initialOrderId={trackingOrderId} />
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="animate-in fade-in duration-300 space-y-12">
            <NotificationHistory />
            
            <div className="border-t border-brand-line pt-4">
              <NotificationPreferences />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
