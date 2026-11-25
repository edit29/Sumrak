'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, label, rub } from '../../lib/config';
import DateTimePicker from '../../components/DateTimePicker';

// Кабинет владельца внутри Telegram. Пароль не нужен: вход по подписанным данным Telegram
// (разрешённый username или ID задаётся на сервере в OWNER_TELEGRAM_USERNAMES / OWNER_TELEGRAM_IDS).
const J = { 'Content-Type': 'application/json' }, ST = { new: 'Новая', agreed: 'Согласована', done: 'Завершена', cancelled: 'Отменена' };
const PHOTO = id => '/miniapp/api/owner/photos/' + id; // cookie сеанса уходит сама, адрес тот же сайт
const loc = d => d ? new Date(new Date(d) - new Date(d).getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';
const displayDate = value => value && /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`
  : value || 'не указано';

function Row({ o, reload }) {
  const schedule = loc(o.scheduledAt);
  const [v, setV] = useState({ status: o.status, finalPrice: o.finalPrice ?? '', scheduledDate: schedule.slice(0, 10), scheduledTime: schedule.slice(11, 16), ownerNote: o.ownerNote });
  const [fe, setFe] = useState({}), [open, setOpen] = useState(false), [msg, setMsg] = useState(''), [zoom, setZoom] = useState('');
  const save = async () => {
    setFe({}); setMsg('');
    if (v.scheduledDate && !v.scheduledTime) { setFe({ scheduledAt: 'Выберите время или очистите выбор.' }); return; }
    try {
      await api('/owner/orders/' + o.id, { method: 'PATCH', headers: J, body: JSON.stringify({ status: v.status, finalPrice: v.finalPrice === '' ? null : +v.finalPrice, scheduledAt: v.scheduledDate && v.scheduledTime ? new Date(`${v.scheduledDate}T${v.scheduledTime}`).toISOString() : null, ownerNote: v.ownerNote }) });
      setMsg('Сохранено'); reload();
    } catch (e) { setFe(e.fields || {}); setMsg(e.message); }
  };
  const del = async () => {
    const run = async () => { try { await api('/owner/orders/' + o.id, { method: 'DELETE' }); reload(); } catch (e) { setMsg(e.message); } };
    const app = window.Telegram?.WebApp; // подтверждение в стиле Telegram, обычный confirm в Mini App не везде работает
    if (app?.showConfirm) app.showConfirm('Удалить заявку вместе с фото? Это нельзя отменить.', ok => ok && run());
    else if (confirm('Удалить заявку вместе с фото? Это нельзя отменить.')) run();
  };
  return <div className="card"><div className="row" onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}><b>{o.name} · {o.phone}</b><span>{ST[o.status]} · {new Date(o.createdAt).toLocaleDateString('ru-RU')}</span></div>
    {open && <div style={{ marginTop: '.7rem' }}>
      {o.items.map((it, i) => <div className="item" key={i}>{it.qty}× {label(it)} — {it.manual ? 'оценка мастера' : rub(it.unit * it.qty)}</div>)}
      <p>Предварительно: {rub(o.knownTotal)}{o.manualCount > 0 && ` + ${o.manualCount} поз. вручную`}</p>
      {o.carName && <p>Автомобиль: {o.carName}</p>}
      <p className="mute">Пожелание: {displayDate(o.wishDate)} {o.wishTime || ''}. {o.comment}</p>
      <div className="chips">{o.photos.map(id => <button key={id} type="button" className="chip" style={{ padding: 0, border: 0, background: 'none' }} onClick={() => setZoom(zoom === id ? '' : id)}><img src={PHOTO(id)} alt="Фото к заявке" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8 }} /></button>)}</div>
      {zoom && <img src={PHOTO(zoom)} alt="Фото к заявке" onClick={() => setZoom('')} style={{ width: '100%', borderRadius: 8, margin: '.5rem 0' }} />}
      <div className="form-field">
        <label htmlFor={`status-${o.id}`}>Статус</label>
        <select id={`status-${o.id}`} value={v.status} onChange={e => setV({ ...v, status: e.target.value })} className="chip owner-field-control">{Object.entries(ST).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
      </div>
      {fe.status && <p className="err">{fe.status}</p>}
      <div className="form-field">
        <label htmlFor={`final-price-${o.id}`}>Итоговая цена, ₽</label>
        {fe.finalPrice && <p className="err">{fe.finalPrice}</p>}
        <input id={`final-price-${o.id}`} className="owner-final-price" type="number" step="any" value={v.finalPrice} onChange={e => setV({ ...v, finalPrice: e.target.value })} />
      </div>
      <div className="form-field">
        <label htmlFor={`scheduledAt-${o.id}`}>Согласованное время</label>
        {fe.scheduledAt && <p className="err">{fe.scheduledAt}</p>}
        <DateTimePicker id={`scheduledAt-${o.id}`} date={v.scheduledDate} time={v.scheduledTime} onChange={(scheduledDate, scheduledTime) => {
          setV(current => ({ ...current, scheduledDate, scheduledTime }));
          setFe(current => ({ ...current, scheduledAt: '' }));
        }} />
      </div>
      <div className="form-field">
        <label htmlFor={`owner-note-${o.id}`}>Приватная заметка</label>
        <textarea id={`owner-note-${o.id}`} value={v.ownerNote} onChange={e => setV({ ...v, ownerNote: e.target.value })} />
      </div>
      <div className="row"><button className="btn" onClick={save}>Сохранить</button><button className="chip" onClick={del}>Удалить</button></div>{msg && <p className="mute">{msg}</p>}</div>}</div>;
}

export default function Owner() {
  const router = useRouter();
  const [list, setList] = useState(null), [err, setErr] = useState(''), [q, setQ] = useState(''), [st, setSt] = useState('');

  const load = useCallback(async () => {
    if (!window.Telegram?.WebApp?.initData) { setErr('Откройте приложение в Telegram.'); return; }
    const fetchList = () => api(`/owner/orders?q=${encodeURIComponent(q)}&status=${st}`);
    try {
      let rows;
      try { rows = await fetchList(); }
      catch (e) { if (e.status !== 401) throw e; await api('/owner/login', { method: 'POST' }); rows = await fetchList(); } // нет сеанса — входим по данным Telegram
      setList(rows); setErr('');
    } catch (e) { setList(null); setErr(e.message); }
  }, [q, st]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => { // системная кнопка «назад» Telegram возвращает на главную
    const back = window.Telegram?.WebApp?.BackButton;
    if (!back) return;
    const go = () => router.push('/');
    back.show(); back.onClick(go);
    return () => { back.offClick(go); back.hide(); };
  }, [router]);

  if (!list) return <main style={{ display: 'block', maxWidth: '24rem' }}><div className="card"><h1>Кабинет</h1>
    {err ? <p className="err" role="alert">{err}</p> : <p className="mute">Входим через Telegram…</p>}
    <div className="row">{err && <button className="btn" onClick={load}>Повторить</button>}<Link href="/" className="btn btn-link">Назад</Link></div></div></main>;
  return <main style={{ display: 'block', maxWidth: '44rem' }}><div className="row"><h1>Заявки</h1>
    <button className="chip" onClick={async () => { try { await api('/owner/logout', { method: 'POST' }); } catch { } router.push('/'); }}>Выйти</button></div>
    <div className="row"><input placeholder="Поиск по имени или телефону" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1 }} />
      <select className="chip" value={st} onChange={e => setSt(e.target.value)}><option value="">Все статусы</option>{Object.entries(ST).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select><button className="chip" onClick={load}>Обновить</button></div>
    {err && <p className="err">{err}</p>}{!list.length && <p className="mute">Заявок нет.</p>}{list.map(o => <Row key={o.id} o={o} reload={load} />)}</main>;
}
