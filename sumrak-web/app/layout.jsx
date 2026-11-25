import './globals.css';

export const metadata = {
  title: { default: 'With love', template: '%s | A Little Invitation' },
  description: 'Одно маленькое приглашение.',
  robots: { index: false, follow: false },
};

export const viewport = { width: '1440', initialScale: 1, themeColor: '#f7f8fc' };

export default function Root({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
