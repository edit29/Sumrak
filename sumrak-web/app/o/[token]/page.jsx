'use client';
import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, label, rub } from '../../../lib/config';
const ST = { new: 'Новая — ждёт связи мастера', agreed: 'Согласована', done: 'Завершена', cancelled: 'Отменена' };
export default function Order({ params }) {
  const { token } = use(params), [o, setO] = useState(null), [err, setErr] = useState(''), [copied, setCopied] = useState(false);
  const load = useCallback(() => api('/orders/' + token).then(setO).catch(e => setErr(e.message)), [token]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  if (err) return <main><div className="card"><h1>Заявка не найдена</h1><p>{err}</p></div></main>;
  if (!o) return <main><div className="card">Загрузка…</div></main>;
  return <main style={{ maxWidth: '40rem', margin: 'auto', display: 'block' }}>
    <section className="card"><h1>Ваша заявка принята</h1><p><b>{ST[o.status]}</b></p>
      {o.final_price != null && <p>Согласованная цена: <b>{rub(o.final_price)}</b></p>}
      {o.scheduled_at && <p>Время: <b>{new Date(o.scheduled_at).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}</b></p>}
      {o.final_price == null && <p>Примерно: {rub(o.known_total)}{o.manual_count > 0 && ` + ${o.manual_count} поз. по оценке мастера`}. Мастер свяжется и согласует цену.</p>}</section>
    <section className="card"><h2>Состав</h2>{o.items.map((it, i) => <div className="item" key={i}>{it.qty}× {label(it)} — {it.manual ? 'оценка мастера' : rub(it.unit * it.qty)}</div>)}</section>
    <div className="row"><button className="btn" onClick={() => navigator.clipboard.writeText(location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>{copied ? 'Скопировано' : 'Скопировать ссылку'}</button><button className="chip" onClick={load}>Обновить</button></div>
    <p className="mute">Сохраните ссылку: по ней открывается ваша заявка и появляются изменения.</p>
    <div style={{ marginTop: '1rem' }}><Link href="/" className="btn btn-link">На главную</Link></div>
  </main>;
}
