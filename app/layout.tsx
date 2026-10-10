import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BackgroundCrossLines } from '@/components/BackgroundCrossLines';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Mafia: Shadows of the City | Multiplayer Party Game',
  description:
    'A real-time multiplayer WebRTC Mafia party game with no servers, instant peer-to-peer rooms, and sleek minimalist aesthetics.',
  openGraph: {
    title: 'Mafia: Shadows of the City',
    description: 'Play real-time multiplayer Mafia directly in your browser with your friends.',
    images: ['/assets/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
