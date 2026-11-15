import BackButton from '../../components/BackButton';
import { CONTACTS } from '../../lib/site';

const description = 'Контакты студии тонировки Сумрак: адрес, телефон, мессенджер и график работы.';

export const metadata = {
  title: 'Контакты',
  description,
  alternates: { canonical: '/contacts' },
  openGraph: { title: 'Контакты | Сумрак', description, url: '/contacts' },
};

function Contact({ label, value, href }) {
  return (
    <p>
      <b>{label}:</b>{' '}
      {href ? <a href={href}>{value}</a> : <span>{value}</span>}
    </p>
  );
}

export default function ContactsPage() {
  return (
    <main className="text-page">
      <article className="card">
        <h1>Контакты</h1>
        <p className="mute">Заменить шаблонные значения в файле lib/site.js на свои контактные данные.</p>
        <Contact label="Город" value={CONTACTS.city} />
        <Contact label="Адрес" value={CONTACTS.address} />
        <Contact label="Телефон" value={CONTACTS.phone} href={CONTACTS.phoneHref} />
        <Contact label="Электронная почта" value={CONTACTS.email} href={CONTACTS.emailHref} />
        <Contact label="Мессенджер (Telegram, WhatsApp, Max)" value={CONTACTS.messenger} href={CONTACTS.messengerHref} />
        <Contact label="График работы" value={CONTACTS.hours} />
        <div style={{ marginTop: '1.25rem' }}>
          <BackButton />
        </div>
      </article>
    </main>
  );
}
