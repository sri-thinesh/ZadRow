import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MagneticCursor } from '@/components/MagneticCursor';
import { SoundEffects } from '@/components/SoundEffects';
import { ProceduralGraphics } from '@/components/ProceduralGraphics';

export const metadata: Metadata = {
  title: 'STUDIO SYNTHETIX | Autonomous Digital Studio',
  description: 'Experience the digital frontier with STUDIO SYNTHETIX. High-velocity kinetic systems, generative AI spatial design, and uncompromised aesthetic precision.',
  keywords: ['Sri Thinesh', 'Student Engineer', 'Software Development', 'Artificial Intelligence', 'Electronics Simulation', 'UI/UX Design', 'Next.js 15'],
  openGraph: {
    title: 'STUDIO SYNTHETIX | Autonomous Digital Studio',
    description: 'Experience the digital frontier with STUDIO SYNTHETIX. High-velocity kinetic systems, generative AI spatial design, and uncompromised aesthetic precision.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#090a0f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;700&family=Syne:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-canvas text-text-primary antialiased selection:bg-primary selection:text-black">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ProceduralGraphics />
        <MagneticCursor />
        <SoundEffects />
        {children}
      </body>
    </html>
  );
}
