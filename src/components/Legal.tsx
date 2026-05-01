'use client';
import * as React from 'react';
import { motion } from 'motion/react';
import { Shield, Scale, HelpCircle, MessageSquare, Book, FileText, Users, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Container = ({ children }: { children: React.ReactNode }) => (
  <div className="pt-32 pb-20 min-h-screen bg-brand-bg text-brand-text px-8 md:px-24">
    <div className="max-w-4xl mx-auto space-y-12">
      {children}
    </div>
  </div>
);

const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="border-l-4 border-brand-accent pl-8 py-4 space-y-4"
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-brand-surface border border-brand-line flex items-center justify-center text-brand-accent">
        <Icon size={20} />
      </div>
      <h2 className="text-3xl font-serif text-brand-black">{title}</h2>
    </div>
    <div className="text-brand-muted text-sm leading-relaxed space-y-6 prose prose-zinc max-w-none">
      {children}
    </div>
  </motion.div>
);

export function Terms() {
  return (
    <Container>
      <div className="mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-brand-accent font-bold mb-4 block underline decoration-brand-accent underline-offset-8">Legal Framework</span>
        <h1 className="text-5xl md:text-7xl font-serif font-light text-brand-black tracking-tighter">Terms & <br/><span className="italic">Conditions</span></h1>
        <p className="text-brand-muted text-xs uppercase tracking-[0.4em] mt-8 font-bold opacity-60">Operational Standard: 2026.1v</p>
      </div>

      <Section title="Governance & Jurisdiction" icon={Scale}>
        <p>
          NowForeverMoods is a signature experiential brand operated by the parent collective, **Arrdublu**. All professional beauty artistry and grooming services are exclusively provided by **Ioka**. 
        </p>
        <p>
          All digital transactions, data processing, and contract management are governed by the **laws of the State of Florida, USA**. This jurisdiction applies to all international clients and oversees the global financial vaulting systems used for reservation securing.
        </p>
        <p>
          For on-site production, physical logistics, and Jamaican domestic engagements, the **laws of Jamaica** maintain primary oversight. Disputes are subject to the exclusive jurisdiction of the judicial systems in Miami-Dade County, Florida, or Kingston, Jamaica, depending on the service origin.
        </p>
      </Section>

      <Section title="The Collective Partnership" icon={Users}>
        <p>
          NowForeverMoods operates as a signature experiential brand under the parent company **Arrdublu**. Our service model is defined by a dual-expertise framework designed to ensure absolute creative consistency:
        </p>
        <div className="space-y-4 pl-6 border-l border-brand-line mt-4">
          <p>
            **Arrdublu (Production & Direction):** Responsible for all cinematic output, creative lighting, location logistics, and technical retouching. Arrdublu holds the master production license for all sessions and serves as the primary technical authority.
          </p>
          <p>
            **Ioka (Artistry & Aesthetics):** Responsible for the beauty architecture, including professional makeup, style coordination, and aesthetic consultation. Ioka serves as the primary beauty authority for all NowForeverMoods sessions.
          </p>
        </div>
        <p className="mt-4 italic">
          By booking with us, you acknowledge that while your experience is facilitated by NowForeverMoods, the professional services are rendered through the combined resources of Arrdublu and Ioka.
        </p>
      </Section>

      <Section title="Reservation Vaulting" icon={HelpCircle}>
        <p>
          To ensure peak availability for editorial collections, a non-refundable retainer (deposit) is required to secure any date. This retainer covers administrative terminal setup and initial creative preparation. 
        </p>
        <p>
          Pricing is dynamic and verified via regional telemetry. Attempts to bypass regional parity pricing through unauthorized proxy servers may result in session cancellation without refund.
        </p>
      </Section>

      <Section title="Creative Integrity" icon={Book}>
        <p>
          All RAW data, unprocessed motion frames, and editorial stills remain the property of NowForeverMoods. License for use is granted to the client upon final balance settlement. No third-party modification or commercial resale is permitted without explicit written variance from the studio directors.
        </p>
        <p className="border-t border-brand-line pt-6 text-[10px] uppercase font-bold tracking-widest opacity-60 italic">
          Data Stewardship Note: Beauty artistry preferences are securely vaulted for Ioka, while cinematic specifications are managed by Arrdublu.
        </p>
      </Section>
    </Container>
  );
}

export function Privacy() {
  return (
    <Container>
      <div className="mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-brand-accent font-bold mb-4 block underline decoration-brand-accent underline-offset-8">Confidentiality</span>
        <h1 className="text-5xl md:text-7xl font-serif font-light text-brand-black tracking-tighter italic">Privacy <span className="not-italic">Protocol</span></h1>
        <p className="text-brand-muted text-xs uppercase tracking-[0.4em] mt-8 font-bold opacity-60">High-End Encryption Active</p>
      </div>

      <Section title="Telemetry Collection" icon={Shield}>
        <p>
          We utilize high-level encryption to secure your identity. Data captured includes verified OAuth markers, transaction metadata from our secure card processors, and regional IP telemetry. All metadata is managed within the secured **Arrdublu infrastructure** to ensure maximum confidentiality. We do not store full card details; payment information is vaulted by our Tier-1 financial partners.
        </p>
      </Section>

      <Section title="Cross-Border Vaulting" icon={Scale}>
        <p>
          Data is vaulted in secure cloud clusters within the United States. International transfer of client information between our Florida and Jamaica bureaus complies with the **Electronic Transactions Act** and the **Florida Information Protection Act (FIPA)**.
        </p>
      </Section>

      <Section title="Visual Privacy" icon={FileText}>
        <p>
          NowForeverMoods respects the privacy of high-profile commissions. Confidentiality agreements (NDAs) are available for all Signature Sessions to ensure editorial content remains private until authorized for release.
        </p>
      </Section>

      <Section title="Data Stewardship & Asset Management" icon={Shield}>
        <p>
          To maintain absolute operational integrity across our collective, data is partitioned by expertise:
        </p>
        <div className="space-y-4 pl-6 border-l border-brand-line mt-4 italic">
          <p>
            **Ioka Artistry:** All beauty profiles, styling notes, and aesthetic preferences provided by the client are stored securely for the exclusive reference of Ioka’s beauty team.
          </p>
          <p>
            **Arrdublu Production:** All project media, technical specifications, and cinematic RAW data are managed strictly within Arrdublu’s secure digital infrastructure.
          </p>
        </div>
      </Section>
    </Container>
  );
}

const FAQItem = ({ q, a }: { q: string, a: string }) => (
  <div className="border-b border-brand-line pb-8 space-y-3">
    <h4 className="text-lg font-serif text-brand-black italic">{q}</h4>
    <p className="text-sm text-brand-muted leading-relaxed">{a}</p>
  </div>
);

export function Support() {
  return (
    <Container>
      <div className="mb-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-brand-accent font-bold mb-4 block underline decoration-brand-accent underline-offset-8">Contact Terminal</span>
        <h1 className="text-5xl md:text-7xl font-serif font-light text-brand-black tracking-tighter underline decoration-brand-line decoration-1 underline-offset-16 italic">Support <span className="not-italic">Bureaus</span></h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-brand-line border border-brand-line shadow-sm mb-20">
        <div className="bg-white p-12 flex flex-col items-center text-center space-y-6">
          <div className="w-14 h-14 bg-brand-surface border border-brand-line flex items-center justify-center text-brand-accent rounded-full">
            <Mail size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-serif text-brand-black mb-2">Global Bureau</h3>
            <p className="text-[11px] uppercase tracking-widest opacity-60 font-bold mb-4">North America & International</p>
            <p className="text-sm text-brand-muted hover:text-brand-accent transition-colors cursor-pointer">studio@nowforevermoods.com</p>
            <p className="text-[9px] text-brand-muted mt-2">FLORIDA, USA</p>
          </div>
        </div>
        <div className="bg-white p-12 flex flex-col items-center text-center space-y-6">
          <div className="w-14 h-14 bg-brand-surface border border-brand-line flex items-center justify-center text-brand-accent rounded-full">
            <HelpCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-serif text-brand-black mb-2">Caribbean Bureau</h3>
            <p className="text-[11px] uppercase tracking-widest opacity-60 font-bold mb-4">Regional & On-Site Prep</p>
            <p className="text-sm text-brand-muted">+1 (876) 555-0100</p>
            <p className="text-[9px] text-brand-muted mt-2">KINGSTON, JAMAICA</p>
          </div>
        </div>
      </div>

      <div className="mb-24 space-y-12">
        <div className="flex items-center gap-4">
          <Shield className="text-brand-accent" size={24} />
          <h2 className="text-3xl font-serif text-brand-black">Concierge & <span className="italic">Coordination</span></h2>
        </div>
        <p className="text-brand-muted text-sm leading-relaxed max-w-2xl">
          To ensure your vision is realized with absolute precision, our support is categorized by your specific needs:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-brand-line border border-brand-line">
          <div className="bg-brand-surface/30 p-8 space-y-4">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-black">For Vision & Concept (Arrdublu)</h4>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              Reach out for questions regarding shoot locations, cinematic delivery timelines, or technical requirements for your project.
            </p>
          </div>
          <div className="bg-brand-surface/30 p-8 space-y-4">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-black">For Beauty & Styling (Ioka)</h4>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              Reach out for questions regarding beauty prep, wardrobe coordination, or specific aesthetic adjustments for your session.
            </p>
          </div>
          <div className="bg-brand-surface/30 p-8 space-y-4">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-black">For General Bookings</h4>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              Our NowForeverMoods concierge oversees the synchronization of both production and beauty teams to ensure your session is seamless.
            </p>
          </div>
        </div>
        <div className="p-6 bg-brand-black text-white text-[10px] uppercase tracking-[0.2em] font-bold text-center">
          Note: For high-priority sessions or wedding collections, you will be assigned a lead coordinator from Arrdublu who will act as the single point of contact between you, Ioka’s beauty team, and our production crew.
          <br/><br/>
          <span className="opacity-60">Data Stewardship Protocol: Beauty/Style notes are archived for Ioka; Media/Technical specs are managed by Arrdublu.</span>
        </div>
      </div>

      <div className="space-y-16">
        <div className="flex items-center gap-4">
          <MessageSquare className="text-brand-accent" size={24} />
          <h2 className="text-3xl font-serif text-brand-black">Frequently Asked <span className="italic">Inquiries</span></h2>
        </div>
        
        <div className="grid gap-12">
          <FAQItem 
            q="What is the difference between a Retainer and a Full Payment?" 
            a="The retainer secures your date in our Administrative Terminal. It is non-refundable and covers initial creative oversight. Full payment settle the license for use and final editorial delivery." 
          />
          <FAQItem 
            q="How does Geo-Pricing verification work?" 
            a="Our terminal uses regional IP telemetry to confirm your location. This ensures you receive the correctly adjusted rate for either the North American (USD) or Caribbean (JMD) market." 
          />
          <FAQItem 
            q="Can I upgrade my collection after booking?" 
            a="Yes. Post-booking adjustments can be made via our Global Bureau. Any delta in pricing will be vaulted through your secure payment reference." 
          />
          <FAQItem 
            q="Do you provide move cinematic packages?" 
            a="Signature Sessions often include motion snippets. Full wedding cinema is available as an add-on to any editorial collection." 
          />
          <FAQItem 
            q="What is your policy on destination travel?" 
            a="We frequently operate between Florida and Jamaica. For locations outside these primary bureaus, travel telemetry and lodging logistics are added to the collection volume." 
          />
          <FAQItem 
            q="How long until we receive the final editorial archives?" 
            a="Standard delivery for Signature Sessions is 14-21 business days. Wedding collections require 6-8 weeks for meticulous hand-finishing." 
          />
        </div>
      </div>

      <div className="mt-24 p-10 border border-brand-line bg-brand-surface/40 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2">
          <h4 className="font-serif text-brand-black text-xl italic tracking-tight">Need urgent telemetry support?</h4>
          <p className="text-sm text-brand-muted">Our directors are available for high-priority session logistics.</p>
        </div>
        <Button className="bg-brand-black text-white hover:bg-zinc-800 rounded-none h-14 px-10 uppercase tracking-widest text-[10px] font-bold">Open Incident Reference</Button>
      </div>
    </Container>
  );
}
