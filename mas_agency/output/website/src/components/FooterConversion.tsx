'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, Sparkles, ArrowUpRight } from 'lucide-react';

export function FooterConversion() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid executive email address.');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <footer
      id="contact"
      aria-label="Contact and Conversion"
      className="relative border-t border-subtle pt-24 pb-16 px-4 sm:px-6 lg:px-8 mt-24 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Main Transmission Card */}
        <div className="glass-panel-elevated p-8 sm:p-14 rounded-3xl relative overflow-hidden">
          <div className="max-w-3xl space-y-6">
            <span className="font-mono text-xs uppercase tracking-widest text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              INITIATE YOUR TRANSMISSION
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-text-primary tracking-tight">
              Ready to construct the <span className="text-gradient">extraordinary?</span>
            </h2>
            <p className="text-text-secondary text-base leading-relaxed">
              Connect directly with STUDIO SYNTHETIX. Gain early deployment access, custom agentic
              architecture briefs, and bespoke digital experiences.
            </p>

            {submitted ? (
              <div className="p-5 rounded-2xl bg-primary/10 border border-primary/30 flex items-center gap-3 text-primary font-mono text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>TRANSMISSION RECEIVED. An executive brief strategist will establish contact within 2 hours.</span>
              </div>
            ) : (
              <form noValidate onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <label htmlFor="executive-email" className="sr-only">Executive Email Address</label>
                  <input
                    id="executive-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter executive email address..."
                    aria-label="Executive Email Address"
                    required
                    className="flex-1 px-5 py-4 min-h-[44px] rounded-full bg-surface border border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[44px] rounded-full bg-primary text-black font-mono font-semibold text-sm hover:bg-white hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all duration-300"
                  >
                    <span>TRANSMIT BRIEF</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                {error && <p className="text-xs font-mono text-red-400 pl-4">{error}</p>}
              </form>
            )}
          </div>
        </div>

        {/* Studio Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-subtle/50 text-xs font-mono text-text-muted">
          <div>
            &copy; {new Date().getFullYear()} STUDIO SYNTHETIX. Engineered by ZadRow Multi-Agent Digital Studio (MAS 2.0).
          </div>
          <div className="flex items-center gap-6">
            <a href="#hero" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">TOP</a>
            <a href="#features" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">MATRIX</a>
            <a href="#showcase" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">TELEMETRY</a>
            <span className="text-primary font-bold">NEXT.JS 15 // REACT 19</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
