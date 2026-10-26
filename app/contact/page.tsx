"use client";

// app/contact/page.tsx

import * as React from 'react';
import Header from '@/components/navigation/header';
import Footer from '@/components/navigation/footer';
import { Mail, Phone, MapPin, Send, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function ContactPage() {
  const [formStatus, setFormStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [selectedServices, setSelectedServices] = React.useState<string[]>([]);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });

  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('contact_messages') 
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            // Combine selected services into the subject line
            subject: selectedServices.length > 0 ? selectedServices.join(', ') : 'General Inquiry',
            // Append company name to the beginning of the message body
            message: formData.company ? `Company/Brand: ${formData.company}\n\n${formData.message}` : formData.message,
          }
        ]);

      if (error) throw error;

      setFormStatus('success');
      setFormData({ name: '', email: '', phone: '', company: '', message: '' }); 
      setSelectedServices([]);
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
        <section className="max-w-4xl mx-auto px-5 sm:px-8 text-center pt-10 sm:pt-16 pb-16 sm:pb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)] text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d]" />
            <span>Start a conversation</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] mb-6">
            Let&apos;s build something <br className="hidden sm:block" />
            great together.
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto">
           Have an idea for an event or a brand? We&apos;d love to hear about it. Share your plans with us, and let&apos;s work together to create something thoughtfully designed, meaningful, and worth remembering.
          </p>
        </section>

        {/* CONTACT GRID */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-20 sm:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* Left Column: Direct Contact Info */}
            <div className="lg:col-span-5 space-y-12">
              <div>
                <h3 className="font-display text-2xl font-bold mb-4">
                  Direct Inquiries
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8">
                  Prefer to skip the form? You can reach us directly via email or phone. We aim to respond to all inquiries within 24 hours.
                </p>

                <div className="space-y-6">
                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center text-[#84871d] dark:text-[#c7cb2d] shrink-0 border border-[var(--border-subtle)]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-1">Email</p>
                      <a href="mailto:info@studioslavie.com" className="text-base font-bold hover:text-[#c7cb2d] transition-colors break-all">
                        info@studioslavie.com
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center text-[#e55130] shrink-0 border border-[var(--border-subtle)]">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-1">Phone / WhatsApp</p>
                      <a href="tel:+2347073725374" className="text-base font-bold hover:text-[#e55130] transition-colors">
                        +234 (0) 7073725374
                      </a>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-primary)] shrink-0 border border-[var(--border-subtle)]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-dim)] mb-1">Headquarters</p>
                      <p className="text-base font-bold text-[var(--text-primary)]">
                       Ogbomoso, Oyo State, Nigeria
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Available for nationwide deployment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* What happens next block */}
              <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-4 h-4 text-[var(--text-dim)]" />
                  <h4 className="font-bold text-sm">What happens next?</h4>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Once you submit your project details, our team will review the brief. We will reply to schedule a short discovery call where we can discuss your vision, timeline, and exact production needs before providing a formal proposal.
                </p>
              </div>
            </div>

            {/* Right Column: Project Inquiry Form */}
            <div className="lg:col-span-7">
              <div className="p-8 sm:p-10 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-sm">
                
                {formStatus === 'success' ? (
                  <div className="text-center py-12 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 rounded-full bg-[#c7cb2d]/10 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-8 h-8 text-[#c7cb2d]" />
                    </div>
                    <h3 className="font-display text-3xl font-bold mb-4">Brief Received!</h3>
                    <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto mb-8 leading-relaxed">
                      Thank you for sharing your project details. Our team is reviewing your brief and will be in touch shortly to schedule a discovery call.
                    </p>
                    <button 
                      onClick={() => setFormStatus('idle')}
                      className="px-8 py-3.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 transition shadow-sm"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
                        Project Brief
                      </h2>
                      <p className="text-sm text-[var(--text-muted)]">
                        Fill out the details below. The more context you provide, the better we can prepare for our first chat.
                      </p>
                    </div>

                    <form onSubmit={handleContactSubmit} className="space-y-6">
                      {/* Name & Email Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-2 font-semibold">
                            Your Name *
                          </label>
                          <input
                            type="text"
                            required
                            disabled={formStatus === 'submitting'}
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Full Name"
                            className="w-full bg-[var(--bg-main)] border border-transparent rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/30 transition disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-2 font-semibold">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            disabled={formStatus === 'submitting'}
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="name@organization.com"
                            className="w-full bg-[var(--bg-main)] border border-transparent rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/30 transition disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {/* Phone & Company Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-2 font-semibold">
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            required
                            disabled={formStatus === 'submitting'}
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="+234 ..."
                            className="w-full bg-[var(--bg-main)] border border-transparent rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/30 transition disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-2 font-semibold">
                            Organization or Brand Name
                          </label>
                          <input
                            type="text"
                            disabled={formStatus === 'submitting'}
                            value={formData.company}
                            onChange={(e) => setFormData({...formData, company: e.target.value})}
                            placeholder="e.g. Tech Summit Africa"
                            className="w-full bg-[var(--bg-main)] border border-transparent rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/30 transition disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {/* Project Type */}
                      <div>
                        <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-3 font-semibold">
                          What do you need help with?
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            'Event Branding & Identity',
                            'Venue/Stage Design & Setup',
                            'Event Media & Visuals',
                            'Corporate Brand Design',
                            'Advertising & Marketing',
                            'Other / Custom Request'
                          ].map((service) => (
                            <label key={service} className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] cursor-pointer hover:border-[#c7cb2d]/50 transition-colors">
                              <input
                                type="checkbox"
                                name="services"
                                value={service}
                                checked={selectedServices.includes(service)}
                                onChange={() => toggleService(service)}
                                disabled={formStatus === 'submitting'}
                                className="w-4 h-4 rounded text-[#c7cb2d] focus:ring-[#c7cb2d] bg-transparent border-[var(--border-strong)] disabled:opacity-50"
                              />
                              <span className={`text-sm font-medium ${formStatus === 'submitting' ? 'opacity-50' : ''}`}>
                                {service}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Project Description */}
                      <div>
                        <label className="block text-[11px] uppercase font-mono tracking-wider text-[var(--text-dim)] mb-2 font-semibold">
                          Project Details *
                        </label>
                        <textarea
                          required
                          disabled={formStatus === 'submitting'}
                          value={formData.message}
                          onChange={(e) => setFormData({...formData, message: e.target.value})}
                          rows={5}
                          placeholder="Tell us a bit about your event or brand. What are the dates, locations, or specific goals you have in mind?"
                          className="w-full bg-[var(--bg-main)] border border-transparent rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-[#c7cb2d] focus:border-[#c7cb2d]/30 transition resize-none disabled:opacity-50"
                        />
                      </div>

                      {formStatus === 'error' && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-medium">
                          Something went wrong. Please try again or reach out to us via email.
                        </div>
                      )}

                      {/* Submit Button */}
                      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button
                          type="submit"
                          disabled={formStatus === 'submitting'}
                          className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[var(--text-primary)] text-[var(--bg-main)] font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {formStatus === 'submitting' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              Send Message
                              <Send className="w-4 h-4" />
                            </>
                          )}
                        </button>
                        <p className="text-[11px] font-mono text-[var(--text-dim)] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c7cb2d] animate-pulse" />
                          We are currently accepting new projects.
                        </p>
                      </div>
                    </form>
                  </>
                )}

              </div>
            </div>

          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}