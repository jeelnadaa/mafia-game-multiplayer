import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BackgroundCrossLines } from '@/components/BackgroundCrossLines';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://the-apes.vercel.app'),
  title: 'Mafia: Shadows of the City | Peer-to-Peer Party Game',
  description:
    'A real-time multiplayer WebRTC Mafia party game with no accounts, no tracking, instant peer-to-peer rooms, and sleek minimalist aesthetics.',
  openGraph: {
    title: 'Mafia: Shadows of the City',
    description: 'Play real-time multiplayer Mafia directly in your browser with your friends. Peer-to-peer, no accounts, no tracking.',
    url: 'https://the-apes.vercel.app',
    siteName: 'Mafia: Shadows of the City',
    type: 'website',
    images: [
      {
        url: 'https://the-apes.vercel.app/assets/og.png',
        width: 1200,
        height: 630,
        alt: 'Mafia: Shadows of the City — Peer-to-Peer Party Game',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mafia: Shadows of the City',
    description: 'Play real-time multiplayer Mafia directly in your browser with your friends. Peer-to-peer, no accounts, no tracking.',
    images: ['https://the-apes.vercel.app/assets/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-text antialiased selection:bg-white selection:text-black min-h-screen flex flex-col relative">
        <BackgroundCrossLines />
        {children}
      </body>
    </html>
  );
}
