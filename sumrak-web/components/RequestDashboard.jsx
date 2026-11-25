'use client';

import { useEffect, useState } from 'react';

export default function RequestDashboard() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');

  async function loadRequest() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/owner/date-request', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { setLoggedIn(false); return; }
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить маршрут.');
      setRequest(data); setLoggedIn(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadRequest(); }, []);

  async function login(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/owner/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не удалось войти.');
      setLoggedIn(true); setPassword(''); await loadRequest();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function logout() {
    await fetch('/api/owner/logout', { method: 'POST' });
    setLoggedIn(false); setRequest(null);
  }

  return (
    <main className="request-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="planner-header"><a className="wordmark" href="/">✳ <span>OUR LITTLE DATE</span></a><span className="header-caption">ЛИЧНАЯ СТРАНИЦА</span></header>
      {!loggedIn ? (
        <section className="login-card"><div className="hero-mark">⌑</div><p className="overline">ТОЛЬКО ДЛЯ ТЕБЯ</p><h1>Личный<br /><span>доступ.</span></h1><p className="hero-copy">Введи пароль владельца, чтобы посмотреть подтверждённый маршрут.</p>
          <form onSubmit={login}><label className="field-label" htmlFor="request-password">Пароль</label><input id="request-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="primary-button" disabled={loading}>{loading ? 'Проверяем…' : 'Войти'} <span>↗</span></button></form>
          {error && <p className="error-message">{error}</p>}
        </section>
      ) : (
        <section className="request-content"><div className="row-between"><div><p className="overline">ПОДТВЕРЖДЁННЫЙ ВЫБОР</p><h1>Ваш маршрут<span> ♥</span></h1></div><button className="secondary-button" onClick={logout}>Выйти</button></div>
          {loading ? <p className="empty-state">Загружаем…</p> : request ? <><div className="request-meta"><span>Заявка №{request.id}</span><span>Подтверждено: {new Date(request.confirmedAt).toLocaleString('ru-RU')}</span></div><div className="request-route">{request.route.map((item, index) => <article key={item.id + index}><span className="route-index">0{index + 1}</span><span className="request-emoji">{item.icon}</span><strong>{item.title}</strong><span className="chosen-tag">Выбрано</span></article>)}</div><button className="secondary-button refresh-button" onClick={loadRequest}>Обновить данные ↻</button></> : <div className="empty-state"><div>♡</div><h2>Пока нет подтверждённого маршрута</h2><p>Когда она соберёт и подтвердит план, он появится здесь.</p><button className="secondary-button" onClick={loadRequest}>Проверить ещё раз</button></div>}
          {error && <p className="error-message">{error}</p>}
        </section>
      )}
    </main>
  );
}
