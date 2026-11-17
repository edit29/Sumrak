import Script from 'next/script';
import { headers } from 'next/headers';
import './globals.css';
import { SITE_URL } from '../lib/site';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Сумрак',
  title: 'Сумрак — заказ тонировки',
  description: 'Оформите заявку на тонирование, бронирование или растонирование автомобиля.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }) {
  await headers();

  return (
    <html lang="ru">
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js?65" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
