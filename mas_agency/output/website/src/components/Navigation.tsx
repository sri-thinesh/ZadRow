'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowUpRight, Sparkles } from 'lucide-react';

const NAV_LINKS = [
  { id: 'hero', label: 'Studio', href: '#hero' },
  { id: 'features', label: 'Matrix', href: '#features' },
  { id: 'showcase', label: 'Telemetry', href: '#showcase' },
  { id: 'contact', label: 'Transmission', href: '#contact' },
];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'py-3 backdrop-blur-md bg-canvas/80 border-b border-subtle shadow-lg'
          : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Studio / Personal Brand */}
          <a
            href="#hero"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1 min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-primary group-hover:border-primary transition-colors">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-widest text-text-primary group-hover:text-primary transition-colors">
                STUDIO SYNTHETIX
              </span>
              
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 rounded-full px-4 py-1.5 glass-panel">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className="px-4 py-2 min-h-[44px] inline-flex items-center text-xs font-mono tracking-wider text-text-secondary hover:text-primary transition-colors rounded-full hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Direct CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#contact"
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full text-xs font-mono font-medium tracking-wide bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-black transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            >
              <span>INITIATE BRIEF</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 text-text-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Accessible Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel-elevated border-b border-subtle px-6 py-8 mt-2 space-y-4">
          <nav className="flex flex-col space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 min-h-[44px] flex items-center text-sm font-mono text-text-secondary hover:text-primary transition-colors rounded-lg hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-4 border-t border-subtle">
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-mono font-semibold bg-primary text-black hover:bg-white transition-colors"
            >
              <span>INITIATE BRIEF</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
