import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NexoIA - Inteligência Artificial',
    short_name: 'NexoIA',
    description: 'Um assistente inteligente, desbocado e hilario alimentado por Gemini.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#8A2BE2', // Purple theme
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
