"use client";

// app/pricing/page.tsx

import * as React from 'react';
import Header from '@/components/navigation/header';
import Footer from '@/components/navigation/footer';
import { ArrowRight, CheckCircle2, Calculator, HelpCircle, Plus, X, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client'; 

// Organized Pricing Categories with Sub-services
const CATEGORIES = [
  {
    id: 'branding',
    name: 'Event Branding',
    scaleable: false,
    subs: [
      { id: 'b_logo', name: 'Logo & Visual Identity', min: 200000, max: 350000 },
      { id: 'b_social', name: 'Social Media Assets', min: 100000, max: 250000 },
      { id: 'b_print', name: 'Print Ready Assets', min: 50000, max: 150000 },
    ],
  },
  {
    id: 'venue',
    name: 'Venue Branding',
    scaleable: true,
    subs: [
      { id: 'v_stage', name: 'Stage Design & Setup', min: 250000, max: 800000 },
      { id: 'v_walkway', name: 'Entrance Tunnels & Walkways', min: 250000, max: 750000 },
      { id: 'v_photo', name: 'Photobooths & Installations', min: 250000, max: 600000 },
    ],
  },
  {
    id: 'media',
    name: 'Event Media',
    scaleable: false,
    subs: [
      { id: 'm_photo', name: 'Photography', min: 150000, max: 400000 },
      { id: 'm_video', name: 'Videography & Highlights', min: 200000, max: 600000 },
      { id: 'm_stream', name: 'Live Streaming', min: 200000, max: 500000 },
      { id: 'm_screen', name: 'Screen Loops & Intro Graphics', min: 100000, max: 300000 },
      { id: 'm_rent', name: 'Screen Rentage', min: 30000, max: 500000 },
    ],
  },
  {
    id: 'corporate',
    name: 'Corporate Identity',
    scaleable: false,
    subs: [
      { id: 'c_logo', name: 'Logo & Brand Guidelines', min: 250000, max: 600000 },
      { id: 'c_web', name: 'Website Design', min: 250000, max: 2000000 },
      { id: 'c_stat', name: 'Stationery Design', min: 50000, max: 200000 },
    ],
  },
];

const SCALES = [
  { id: 'small', name: 'Intimate (Up to 200 people)', multiplier: 1 },
  { id: 'medium', name: 'Standard (200 - 800 people)', multiplier: 1.5 },
  { id: 'large', name: 'Massive (800+ people)', multiplier: 2.2 },
];

export default function PricingPage() {
  const [selectedSubs, setSelectedSubs] = React.useState<string[]>(['v_stage']);
  const [selectedScale, setSelectedScale] = React.useState<string>('medium');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formStatus, setFormStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Reset form status when modal closes
      setTimeout(() => setFormStatus('idle'), 300);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const toggleSub = (id: string) => {
    setSelectedSubs(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const hasScaleableSub = selectedSubs.some(subId => {
    return CATEGORIES.find(c => c.scaleable)?.subs.some(s => s.id === subId);
  });

  const calculateTotal = () => {
    let min = 0;
    let max = 0;
    const currentScale = SCALES.find(s => s.id === selectedScale)?.multiplier || 1;

    selectedSubs.forEach(subId => {
      CATEGORIES.forEach(category => {
        const sub = category.subs.find(s => s.id === subId);
        if (sub) {
          const multiplier = category.scaleable ? currentScale : 1;
          min += sub.min * multiplier;
          max += sub.max * multiplier;
        }
      });
    });

    return { min, max };
  };

  const { min, max } = calculateTotal();

  const formatNGN = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShortNGN = (value: number) => {
    return `₦${value / 1000}k`;
  };

  const getSubName = (subId: string) => {
    for (const cat of CATEGORIES) {
      const sub = cat.subs.find(s => s.id === subId);
      if (sub) return sub.name;
    }
    return '';
  };

  const getCategoryMin = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return 0;
    return Math.min(...category.subs.map(s => s.min));
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');

    try {
      const supabase = createClient();
      
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        services_requested: selectedSubs.map(id => getSubName(id)), 
        estimated_min: min,
        estimated_max: max,
        event_scale: hasScaleableSub ? selectedScale : 'N/A'
      };

      const { error } = await supabase
        .from('quote_requests') 
        .insert([payload]);

      if (error) throw error;

      setFormStatus('success');
      setFormData({ name: '', email: '', phone: '', company: '' }); // Clear form
    } catch (error) {
      console.error('Submission failed', error);
      setFormStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors">
      <Header />

      <main className="flex-1 pt-28 sm:pt-32 pb-16">
        {/* HERO SECTION */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 text-center pt-10 sm:pt-16 pb-16 sm:pb-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />
            <span>Investment & Pricing</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-6">
            Transparent pricing. <br className="hidden sm:block" /> No surprises.
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto">
            We believe in upfront conversations about money. While every stage build and brand system is custom, we have established baseline starting points so you know exactly what to expect before we ever get on a call.
          </p>
        </section>

        {/* BASELINE STARTING PRICES GRID */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-20 sm:pb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                title: 'Event Branding', 
                price: '₦200k', 
                desc: 'Primary visual identity systems, color palettes, and logo design for your event.' 
              },
              { 
                title: 'Venue Branding', 
                price: '₦250k', 
                desc: 'Custom stage setups, entrance walkways, photobooths, and spatial design.' 
              },
              { 
                title: 'Event Media', 
                price: '₦150k', 
                desc: 'Professional event photography, videography, and dynamic screen visuals.' 
              },
              { 
                title: 'Corporate Identity', 
                price: '₦250k', 
                desc: 'Business branding overhauls, core logo concepts, and corporate website design.' 
              },
            ].map((pkg, i) => (
              <div key={i} className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col justify-between">
                <div>
                  <h3 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-dim)] font-bold mb-2">
                    Starting from
                  </h3>
                  <div className="font-display text-3xl font-bold text-[var(--text-primary)] mb-4">
                    {pkg.price}
                  </div>
                  <h4 className="font-bold text-base mb-2">{pkg.title}</h4>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8">
                    {pkg.desc}
                  </p>
                </div>
                <div className="pt-6 border-t border-[var(--border-subtle)] text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  Custom Quoted
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* INTERACTIVE ESTIMATOR */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-20 sm:pb-32">
          <div className="p-1 rounded-3xl bg-gradient-to-b from-[var(--border-strong)] to-transparent">
            <div className="p-8 sm:p-12 rounded-[22px] bg-[var(--bg-main)] shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <Calculator className="w-5 h-5 text-[#c7cb2d]" />
                <h2 className="font-display text-2xl sm:text-3xl font-bold">Project Estimator</h2>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-10 max-w-xl">
                Select the specific services you need to generate a rough estimated range. This helps us ensure we are aligned on budget right from the start.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                {/* Toggles Side */}
                <div className="lg:col-span-7 space-y-10">
                  
                  {/* Detailed Services Toggle (Pill UI) */}
                  <div>
                    <h3 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-dim)] font-bold mb-6">
                      1. Select Required Services
                    </h3>
                    <div className="space-y-8">
                      {CATEGORIES.map((category) => (
                        <div key={category.id}>
                          <h4 className="font-bold text-sm mb-3 text-[var(--text-primary)]">
                            {category.name}
                          </h4>
                          <div className="flex flex-wrap gap-2.5">
                            {category.subs.map((sub) => {
                              const isSelected = selectedSubs.includes(sub.id);
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => toggleSub(sub.id)}
                                  className={`flex items-center gap-2 py-2 px-4 rounded-full text-xs font-medium border transition-all ${
                                    isSelected 
                                      ? 'bg-[var(--text-primary)] text-[var(--bg-main)] border-[var(--text-primary)] shadow-sm' 
                                      : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[#c7cb2d]/50'
                                  }`}
                                >
                                  {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-[#c7cb2d]" /> : <Plus className="w-3.5 h-3.5 opacity-50" />}
                                  {sub.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scale Toggle (Only shows if a Venue Branding service is selected) */}
                  {hasScaleableSub && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 pt-8 border-t border-[var(--border-subtle)]">
                      <h3 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-dim)] font-bold mb-4">
                        2. Event Scale (Affects Venue Branding)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {SCALES.map((scale) => (
                          <button
                            key={scale.id}
                            onClick={() => setSelectedScale(scale.id)}
                            className={`p-4 rounded-xl border text-left transition-all ${
                              selectedScale === scale.id
                                ? 'bg-[var(--bg-card)] border-[#c7cb2d]/50 ring-1 ring-[#c7cb2d]/20'
                                : 'bg-[var(--bg-main)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-full mb-3 border flex items-center justify-center ${
                              selectedScale === scale.id ? 'border-[#c7cb2d]' : 'border-[var(--border-strong)]'
                            }`}>
                              {selectedScale === scale.id && <div className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />}
                            </div>
                            <span className={`block text-xs font-bold mb-1 ${
                              selectedScale === scale.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                            }`}>
                              {scale.name.split(' (')[0]}
                            </span>
                            <span className="block text-[10px] text-[var(--text-dim)] uppercase">
                              ({scale.name.split('(')[1]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Estimate Output Side */}
                <div className="lg:col-span-5">
                  <div className="sticky top-32 p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                    <h3 className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-dim)] font-bold mb-6">
                      Estimated Investment Range
                    </h3>
                    
                    {selectedSubs.length === 0 ? (
                      <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                        Select at least one service to see an estimate.
                      </div>
                    ) : (
                      <>
                        <div className="mb-8">
                          <div className="font-display text-4xl sm:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
                            {formatNGN(min)}
                          </div>
                          <div className="text-[var(--text-dim)] text-sm font-mono mt-2">
                            to {formatNGN(max)}
                          </div>
                        </div>

                        <ul className="space-y-3 mb-8 pt-6 border-t border-[var(--border-subtle)] max-h-60 overflow-y-auto pr-2">
                          {selectedSubs.map(id => (
                            <li key={id} className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#c7cb2d] shrink-0 mt-0.5" />
                              {getSubName(id)}
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="w-full py-4 rounded-xl bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          Request Exact Quote
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] text-center text-[var(--text-dim)] mt-4 leading-relaxed">
                          *This is a rough estimate, not a final quote. Project scope, travel, logistics, and physical constraints may adjust final pricing.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQS */}
        <section className="max-w-4xl mx-auto px-5 sm:px-8 pb-20 sm:pb-32">
          <div className="flex items-center justify-center gap-3 mb-12">
            <HelpCircle className="w-5 h-5 text-[var(--text-dim)]" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Frequently Asked Questions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <div>
              <h4 className="font-bold text-sm mb-2">What are your payment terms?</h4>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                We require a 70% mobilization deposit to lock in your production dates and begin work. The remaining 30% balance is due 48 hours before the event date or upon final file delivery for corporate branding.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-2">Do you travel outside Oyo State?</h4>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Yes. We regularly deploy teams to Lagos, Abuja, Osogbo, and Port Harcourt. Travel, logistics, and crew accommodation will be added as a separate line item on your custom quote.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-2">How much lead time do you need?</h4>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                For events (venue branding and stage builds), we request a minimum of 3-4 weeks lead time. For corporate identity, 2-3 weeks is standard. Rush production is available for a fee.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-2">Are 3D renders included?</h4>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Yes. Any physical spatial or stage build project includes photorealistic 3D mockups in the design phase, so you know exactly how the venue will look before we print a single banner.
              </p>
            </div>
          </div>
        </section>

      </main>

      <Footer />

      {/* QUOTE REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => formStatus !== 'submitting' && setIsModalOpen(false)}
          />
          
          <div className="relative w-full max-w-lg bg-[var(--bg-card)] rounded-[24px] border border-[var(--border-strong)] shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              disabled={formStatus === 'submitting'}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--bg-main)] flex items-center justify-center border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            {formStatus === 'success' ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-full bg-[#c7cb2d]/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-[#c7cb2d]" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-3">Request Received!</h3>
                <p className="text-sm text-[var(--text-muted)] mb-8">
                  We have logged your project specifications. Our team will review the details and reach out within 24 hours to schedule a discovery call.
                </p>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 transition cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8 pr-8">
                  <h3 className="font-display text-2xl font-bold mb-2">Send Quote Request</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    You are requesting a formal quote for <span className="font-bold text-[var(--text-primary)]">{selectedSubs.length} services</span> with an estimated range of <span className="font-bold text-[var(--text-primary)]">{formatNGN(min)} - {formatNGN(max)}</span>.
                  </p>
                </div>

                <form onSubmit={handleQuoteSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-1.5 font-bold">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={formStatus === 'submitting'}
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/50 transition disabled:opacity-50"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-1.5 font-bold">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        disabled={formStatus === 'submitting'}
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/50 transition disabled:opacity-50"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-1.5 font-bold">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      disabled={formStatus === 'submitting'}
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/50 transition disabled:opacity-50"
                      placeholder="+234 ..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-1.5 font-bold">
                      Company / Organization (Optional)
                    </label>
                    <input
                      type="text"
                      disabled={formStatus === 'submitting'}
                      value={formData.company}
                      onChange={e => setFormData({...formData, company: e.target.value})}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/50 transition disabled:opacity-50"
                      placeholder="e.g. Tech Summit Africa"
                    />
                  </div>

                  {formStatus === 'error' && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center">
                      Something went wrong. Please try again or contact us directly.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={formStatus === 'submitting'}
                    className="w-full mt-4 py-4 rounded-xl bg-[#c7cb2d] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#d6da35] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {formStatus === 'submitting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Request...
                      </>
                    ) : (
                      'Submit formal request'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}