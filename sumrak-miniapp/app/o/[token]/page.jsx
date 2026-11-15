'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, label, rub } from '../../../lib/config';

const STATUS = {
  new: 'Новая — ждёт связи мастера',
  agreed: 'Согласована',
  done: 'Завершена',
  cancelled: 'Отменена',
};

export default function Order({ params }) {
  const { token } = use(params);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const load = useCallback(() => api('/orders/' + token).then(setOrder).catch(e => setError(e.message)), [token]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  if (error) return <main><div className="card"><h1>Заявка не найдена</h1><p>{error}</p></div></main>;
  if (!order) return <main><div className="card">Загрузка…</div></main>;

  return (
    <main style={{ maxWidth: '40rem', margin: 'auto', display: 'block' }}>
      <section className="card">
        <h1>Ваша заявка принята</h1>
        <p><b>{STATUS[order.status]}</b></p>
        {order.final_price != null && <p>Согласованная цена: <b>{rub(order.final_price)}</b></p>}
        {order.scheduled_at && <p>Время: <b>{new Date(order.scheduled_at).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}</b></p>}
        {order.final_price == null && <p>Примерно: {rub(order.known_total)}{order.manual_count > 0 && ` + ${order.manual_count} поз. по оценке мастера`}. Мастер свяжется и согласует цену.</p>}
      </section>
      <section className="card">
        <h2>Состав</h2>
        {order.items.map((item, index) => (
          <div className="item" key={index}>{item.qty}× {label(item)} — {item.manual ? 'оценка мастера' : rub(item.unit * item.qty)}</div>
        ))}
      </section>
      <div className="row">
        <button className="btn" onClick={() => navigator.clipboard.writeText(location.href).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })}>{copied ? 'Скопировано' : 'Скопировать ссылку'}</button>
        <button className="chip" onClick={load}>Обновить</button>
      </div>
      <p className="mute">Сохраните ссылку: по ней открывается ваша заявка и появляются изменения.</p>
      <div style={{ marginTop: '1rem' }}><Link href="/" className="btn btn-link">Назад к заказу</Link></div>
    </main>
  );
}
