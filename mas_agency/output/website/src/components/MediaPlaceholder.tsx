'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Play, Maximize2, Compass, LayoutGrid } from 'lucide-react';

export interface MediaPlaceholderProps {
  type?: 'photo' | 'video' | 'gallery' | 'space';
  aspectRatio?: string;
  title?: string;
  subtitle?: string;
  dimensions?: string;
  className?: string;
  showAnimation?: boolean;
}

export function MediaPlaceholder({
  type = 'photo',
  aspectRatio = 'aspect-video',
  title,
  subtitle,
  dimensions = '1920 × 1080',
  className = '',
  showAnimation = true,
}: MediaPlaceholderProps) {
  const [isHovered, setIsHovered] = useState(false);

  const defaultTitle =
    title ||
    (type === 'video'
      ? 'Cinematic Transmission'
      : type === 'gallery'
      ? 'Curated Media Gallery'
      : type === 'space'
      ? 'Reserved Spatial Coordinate'
      : 'Visual Architecture Capture');

  const defaultSubtitle =
    subtitle ||
    (type === 'video'
      ? '02:45 • 4K 60FPS'
      : type === 'gallery'
      ? 'Interactive Gallery Matrix'
      : type === 'space'
      ? 'Dynamic Spatial Container'
      : 'Optical Matrix • HDR');

  const aspectClass =
    aspectRatio === 'video' || aspectRatio === 'aspect-video'
      ? 'aspect-video'
      : aspectRatio === '4/3' || aspectRatio === 'aspect-[4/3]'
      ? 'aspect-[4/3]'
      : aspectRatio === 'square' || aspectRatio === 'aspect-square'
      ? 'aspect-square'
      : aspectRatio;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="region"
      aria-label={`${defaultTitle} (${type} media container)`}
      className={`group relative overflow-hidden rounded-2xl w-full ${aspectClass} transition-all duration-500 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-primary ${
        type === 'space'
          ? 'border border-dashed border-white/20 bg-surface/30 hover:border-primary/60 hover:bg-surface/50'
          : 'border border-subtle bg-surface/70 glass-panel hover:border-primary/50 shadow-lg'
      } ${className}`}
    >
      {/* Background Animated Grid & Ambient Pattern */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Shimmer Light Sheen Animation */}
      {showAnimation && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none" />
      )}

      {/* Central Visual Icon & Spatial Animation */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
        {type === 'video' ? (
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all duration-300">
              <Play className="w-6 h-6 ml-0.5 fill-current" />
            </div>
            {showAnimation && (
              <span className="absolute -inset-1 rounded-full border border-primary/30 animate-ping opacity-40 pointer-events-none" />
            )}
          </div>
        ) : type === 'gallery' ? (
          <div className="w-12 h-12 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary group-hover:scale-110 group-hover:border-primary transition-all duration-300">
            <LayoutGrid className="w-6 h-6" />
          </div>
        ) : type === 'space' ? (
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted group-hover:text-primary group-hover:border-primary/40 transition-colors">
            <Compass className="w-6 h-6 animate-spin [animation-duration:12s]" />
          </div>
        ) : type === 'photo' ? (
          <div className="w-12 h-12 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary group-hover:scale-110 group-hover:border-primary transition-all duration-300">
            <ImageIcon className="w-6 h-6" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary group-hover:scale-110 group-hover:border-primary transition-all duration-300">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}

        <div className="space-y-1">
          <div className="font-display font-bold text-sm sm:text-base text-text-primary tracking-wide group-hover:text-primary transition-colors">
            {defaultTitle}
          </div>
          <div className="font-mono text-xs text-text-secondary">
            {defaultSubtitle}
          </div>
        </div>

        {/* Dimension & Telemetry Tag */}
        <div className="pt-2 flex items-center gap-2 text-[10px] font-mono text-text-muted uppercase tracking-wider">
          <span className="px-2 py-0.5 rounded bg-black/40 border border-subtle">
            {dimensions}
          </span>
          <span className="inline-flex items-center gap-1 text-primary">
            <Sparkles className="w-2.5 h-2.5" />
            <span>ACTIVE ANIMATION</span>
          </span>
        </div>
      </div>

      {/* Corner Expand Indicator */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-primary">
        <Maximize2 className="w-4 h-4" />
      </div>

      {/* Ambient Breathing Border Glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 border border-primary/40 pointer-events-none" />
    </div>
  );
}
