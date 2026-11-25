import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© Сумрак</span>
      <div className="site-footer-actions">
        <nav aria-label="Информация о сайте">
          <Link href="/contacts">Контакты</Link>
          <Link href="/privacy">Политика конфиденциальности</Link>
        </nav>
      </div>
    </footer>
  );
}
