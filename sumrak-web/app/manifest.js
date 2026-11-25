export default function manifest() {
  return {
    id: '/',
    name: 'Сумрак — тонировка стёкол',
    short_name: 'Сумрак',
    description: 'Настройте тонировку автомобиля и отправьте заявку.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f5f8',
    theme_color: '#f3f5f8',
    lang: 'ru',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
}
