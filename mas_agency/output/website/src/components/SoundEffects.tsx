'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function SoundEffects() {
  const [enabled, setEnabled] = useState(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        setAudioCtx(ctx);
        setEnabled(true);
      }
    } else {
      setEnabled(!enabled);
    }
  };

  const playTone = (freq: number, type: OscillatorType = 'sine', duration = 0.08) => {
    if (!enabled || !audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Ignore audio synthesis errors on strict browsers
    }
  };

  useEffect(() => {
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button') || target?.closest('a')) {
        playTone(800, 'triangle', 0.05);
      }
    };

    window.addEventListener('click', handleButtonClick, { passive: true });
    return () => window.removeEventListener('click', handleButtonClick);
  }, [enabled, audioCtx]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        type="button"
        onClick={initAudio}
        aria-label={enabled ? 'Disable Futuristic Sound FX' : 'Enable Futuristic Sound FX'}
        className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-all duration-300 ${
          enabled
            ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(0,240,255,0.4)]'
            : 'glass-panel text-text-muted hover:text-white'
        }`}
      >
        {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    </div>
  );
}
