import './globals.css';
import Script from 'next/script';
import PwaRegister from '../components/PwaRegister';
import SiteFooter from '../components/SiteFooter';
import { SITE_URL } from '../lib/site';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Сумрак',
  title: {
    default: 'Сумрак — тонировка стёкол',
    template: '%s | Сумрак',
  },
  description: 'Настройте тонировку автомобиля, узнайте примерную цену и отправьте заявку.',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Сумрак',
    title: 'Сумрак — тонировка стёкол',
    description: 'Настройте тонировку автомобиля, узнайте примерную цену и отправьте заявку.',
  },
  twitter: { card: 'summary' },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Сумрак',
    statusBarStyle: 'default',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f3f5f8',
};

export default function Root({ children }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: "try{const t=localStorage.getItem('sumrak-theme')==='dark'?'dark':'light';document.documentElement.dataset.theme=t;const m=document.querySelector('meta[name=\"theme-color\"]');if(m)m.content=t==='dark'?'#0e1319':'#f3f5f8'}catch{document.documentElement.dataset.theme='light'}",
          }}
        />
        {children}
        <SiteFooter />
        <PwaRegister />
      </body>
    </html>
  );
}
