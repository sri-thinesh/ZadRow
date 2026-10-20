import { Navigation } from '@/components/Navigation';
import { HeroStage } from '@/components/HeroStage';
import { FeatureBento } from '@/components/FeatureBento';
import { InteractiveShowcase } from '@/components/InteractiveShowcase';
import { FooterConversion } from '@/components/FooterConversion';

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden">
      <Navigation />
      <main id="main-content" className="flex-1">
        <HeroStage />
        <FeatureBento />
        <InteractiveShowcase />
      </main>
      <FooterConversion />
    </div>
  );
}
