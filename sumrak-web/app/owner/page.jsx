'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, label, rub } from '../../lib/config';
import DateTimePicker from '../../components/DateTimePicker';
const J = { 'Content-Type': 'application/json' }, ST = { new: 'Новая', agreed: 'Согласована', done: 'Завершена', cancelled: 'Отменена' };
const loc = d => d ? new Date(new Date(d) - new Date(d).getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';
const displayDate = value => value && /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`
  : value || 'не указано';
function Row({ o, reload }) {
  const schedule = loc(o.scheduledAt);
  const [v, setV] = useState({ status: o.status, finalPrice: o.finalPrice ?? '', scheduledDate: schedule.slice(0, 10), scheduledTime: schedule.slice(11, 16), ownerNote: o.ownerNote }), [fe, setFe] = useState({}), [open, setOpen] = useState(false), [msg, setMsg] = useState('');
  const save = async () => { setFe({}); setMsg('');
    if (v.scheduledDate && !v.scheduledTime) { setFe({ scheduledAt: 'Выберите время или очистите выбор.' }); return; }
    try { await api('/owner/orders/' + o.id, { method: 'PATCH', headers: J, body: JSON.stringify({ status: v.status, finalPrice: v.finalPrice === '' ? null : +v.finalPrice, scheduledAt: v.scheduledDate && v.scheduledTime ? new Date(`${v.scheduledDate}T${v.scheduledTime}`).toISOString() : null, ownerNote: v.ownerNote }) }); setMsg('Сохранено'); reload(); }
    catch (e) { setFe(e.fields || {}); setMsg(e.message); } };
  const del = async () => { if (confirm('Удалить заявку вместе с фото? Это нельзя отменить.')) { await api('/owner/orders/' + o.id, { method: 'DELETE' }); reload(); } };
  return <div className="card"><div className="row" onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}><b>{o.name} · {o.phone}</b><span>{ST[o.status]} · {new Date(o.createdAt).toLocaleDateString('ru-RU')}</span></div>
    {open && <div style={{ marginTop: '.7rem' }}>
      {o.items.map((it, i) => <div className="item" key={i}>{it.qty}× {label(it)} — {it.manual ? 'оценка мастера' : rub(it.unit * it.qty)}</div>)}
      <p>Предварительно: {rub(o.knownTotal)}{o.manualCount > 0 && ` + ${o.manualCount} поз. вручную`}</p>
      {o.carName && <p>Автомобиль: {o.carName}</p>}
      <p className="mute">Пожелание: {displayDate(o.wishDate)} {o.wishTime || ''}. {o.comment}</p>
      <div className="chips">{o.photos.map(id => <a key={id} href={'/api/owner/photos/' + id} target="_blank"><img src={'/api/owner/photos/' + id} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8 }} /></a>)}</div>
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
  const [list, setList] = useState(null), [pw, setPw] = useState(''), [err, setErr] = useState(''), [q, setQ] = useState(''), [st, setSt] = useState('');
  const load = useCallback(() => api(`/owner/orders?q=${encodeURIComponent(q)}&status=${st}`).then(setList).catch(e => e.status === 401 ? setList(false) : setErr(e.message)), [q, st]);
  useEffect(() => { load(); }, [load]);
  const login = async () => { setErr(''); try { await api('/owner/login', { method: 'POST', headers: J, body: JSON.stringify({ password: pw }) }); setPw(''); load(); } catch (e) { setErr(e.message); } };
  if (list === false) return <main style={{ display: 'block', maxWidth: '24rem' }}><div className="card"><h1>Вход в кабинет</h1>{err && <p className="err">{err}</p>}
    <input type="password" placeholder="Пароль" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
    <div className="row"><button className="btn" onClick={login}>Войти</button><Link href="/" className="btn btn-link">Назад</Link></div></div></main>;
  return <main style={{ display: 'block', maxWidth: '44rem' }}><div className="row"><h1>Заявки</h1><button className="chip" onClick={async () => { await api('/owner/logout', { method: 'POST' }); setList(false); }}>Выйти</button></div>
    <div className="row"><input placeholder="Поиск по имени или телефону" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1 }} />
      <select className="chip" value={st} onChange={e => setSt(e.target.value)}><option value="">Все статусы</option>{Object.entries(ST).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select><button className="chip" onClick={load}>Обновить</button></div>
    {err && <p className="err">{err}</p>}{list && !list.length && <p className="mute">Заявок нет.</p>}{list && list.map(o => <Row key={o.id} o={o} reload={load} />)}</main>;
}
