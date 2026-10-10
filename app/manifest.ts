import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MAFIA: Shadows of the City',
    short_name: 'Mafia',
    description: 'Real-time multiplayer WebRTC Mafia party game with no servers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08090D',
    theme_color: '#08090D',
    icons: [
      {
        src: '/icon.png',
        sizes: '256x256',
        type: 'image/png',
      },
    ],
  };
}
