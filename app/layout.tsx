import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'MAFIA: Shadows of the City | Multiplayer Party Game',
  description:
    'A real-time multiplayer WebRTC Mafia party game with no servers, instant peer-to-peer rooms, and sleek noir aesthetics.',
  openGraph: {
    title: 'MAFIA: Shadows of the City',
    description: 'Play real-time multiplayer Mafia directly in your browser with your friends.',
    images: ['/assets/og.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#08090D',
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
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} dark`}>
      <body className="bg-bg text-text antialiased selection:bg-mafia/30 selection:text-text min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
