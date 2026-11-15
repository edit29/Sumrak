'use client';

import { useEffect, useState } from 'react';
import HomePage from '../components/HomePage';
import { SITE_URL } from '../lib/site';

export default function Page() {
  const [telegramReady, setTelegramReady] = useState(false);

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (!app) return;

    app.ready();
    app.expand();
    app.setHeaderColor?.('bg_color');
    app.setBackgroundColor?.('bg_color');
    setTelegramReady(Boolean(app.initData));
  }, []);

  if (!telegramReady) {
    return (
      <main className="telegram-required">
        <section className="card">
          <h1>Откройте приложение в Telegram</h1>
          <p className="mute">Для оформления заявки требуется подтверждённая сессия Telegram.</p>
          <a className="btn btn-link" href={SITE_URL}>Перейти на сайт</a>
        </section>
      </main>
    );
  }

  return (
    <>
      <p className="miniapp-intro">Заявка через Telegram · <a href={`${SITE_URL}/owner`} target="_blank" rel="noreferrer">Вход владельца</a></p>
      <HomePage />
    </>
  );
}
