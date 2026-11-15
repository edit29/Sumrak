'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../lib/config';
import DateTimePicker, { addDays, availableTimes, dateValue } from './DateTimePicker';
const OK = ['image/jpeg', 'image/png', 'image/webp'];
async function shrink(f) { // сжатие до 1600 px, JPEG
  const b = await createImageBitmap(f), k = Math.min(1, 1600 / Math.max(b.width, b.height)), c = document.createElement('canvas');
  c.width = Math.round(b.width * k); c.height = Math.round(b.height * k); c.getContext('2d').drawImage(b, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(x => x ? res(x) : rej(), 'image/jpeg', .82));
}
const Field = ({ id, label, err, children }) => <div className="form-field">
  {label && <label htmlFor={id}>{label}</label>}
  {err && <p className="err" role="alert">{err}</p>}
  {children}
</div>;
export default function OrderForm({ cart, carName }) {
  const router = useRouter(), [f, setF] = useState({ name: '', phone: '', wishDate: '', wishTime: '', comment: '', consent: false }), [fe, setFe] = useState({});
  const [photos, setPhotos] = useState([]), [busy, setBusy] = useState(false), [gen, setGen] = useState(''), key = useRef(''), ready = useRef(false), photoPicker = useRef(null);
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('sumrak-miniapp-form') || '{}');
      if (s.f) {
        const today = dateValue(new Date());
        const wishDate = typeof s.f.wishDate === 'string' && s.f.wishDate >= today && s.f.wishDate <= addDays(today, 13) ? s.f.wishDate : '';
        const wishTime = wishDate && availableTimes(wishDate, today).includes(s.f.wishTime) ? s.f.wishTime : '';
        setF({ ...s.f, wishDate, wishTime });
      }
      key.current = s.key || '';
    } catch { }
    ready.current = true;
  }, []);
  useEffect(() => { if (ready.current) try { localStorage.setItem('sumrak-miniapp-form', JSON.stringify({ f, key: key.current })); } catch { } }, [f]);
  const set = (k, v) => { setF({ ...f, [k]: v }); setFe({ ...fe, [k]: '' }); };
  const upd = (lid, p) => setPhotos(ps => ps.map(x => x.lid === lid ? { ...x, ...p } : x));
  async function up(lid, file) {
    upd(lid, { st: 'up', msg: '' });
    try { if (!OK.includes(file.type)) throw new Error('Нужен JPEG, PNG или WebP'); const fd = new FormData(); fd.append('file', await shrink(file), 'photo.jpg');
      const result = await api('/photos', { method: 'POST', body: fd });
      upd(lid, { st: 'ok', id: result.id }); } catch (e) { upd(lid, { st: 'err', msg: e.message || 'Не удалось прочитать файл' }); }
  }
  function pick(e) { const room = 3 - photos.length; [...e.target.files].slice(0, room).forEach(file => { const lid = crypto.randomUUID(); setPhotos(ps => [...ps, { lid, file, url: URL.createObjectURL(file), st: 'up' }]); up(lid, file); }); e.target.value = ''; setFe({ ...fe, photos: '' }); }
  async function send() {
    setGen(''); setBusy(true); if (!key.current) key.current = crypto.randomUUID(); // тот же ключ при повторе = без дубля
    try { const r = await api('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key.current },
      body: JSON.stringify({ ...f, carName, items: cart.map(c => ({ ...c, windows: c.type === 'other' ? [] : c.windows })), photoIds: photos.filter(p => p.st === 'ok').map(p => p.id) }) });
      localStorage.removeItem('sumrak-miniapp'); localStorage.removeItem('sumrak-miniapp-form'); router.push('/o/' + r.token);
    } catch (e) { setFe(e.fields || {}); setGen(e.message); setBusy(false); }
  }
  const needPhoto = cart.some(c => c.type === 'other');
  const setDateTime = (wishDate, wishTime) => {
    setF(current => ({ ...current, wishDate, wishTime }));
    setFe(current => ({ ...current, wishDate: '', wishTime: '' }));
  };
  return <section className="card"><h2>Заявка</h2>
    <Field id="name" label="Имя" err={fe.name}><input id="name" value={f.name} onChange={e => set('name', e.target.value)} autoComplete="name" /></Field>
    <Field id="phone" label="Телефон" err={fe.phone}><input id="phone" type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" /></Field>
    <Field id="wishDate" label="Желаемая дата и время (необязательно)" err={fe.wishDate || fe.wishTime}>
      <DateTimePicker date={f.wishDate} time={f.wishTime} onChange={setDateTime} />
    </Field>
    <div>Фото автомобиля (до 3){needPhoto ? ' — для «Другое» нужно хотя бы одно' : ' — по желанию'}{fe.photos && <p className="err" role="alert">{fe.photos}</p>}
      <div className="chips" style={{ margin: '.4rem 0 .7rem' }}>{photos.map(p => <div key={p.lid} style={{ width: 96 }}><img src={p.url} alt="" style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 8, opacity: p.st === 'ok' ? 1 : .5 }} />
        <div className="mute">{p.st === 'up' ? 'Загрузка…' : p.st === 'ok' ? 'Готово' : p.msg}</div>
        {p.st === 'err' && <button className="chip" onClick={() => up(p.lid, p.file)}>Повторить</button>}<button className="chip" onClick={() => setPhotos(ps => ps.filter(x => x.lid !== p.lid))}>Удалить</button></div>)}</div>
      {photos.length < 3 && <div className="photo-picker">
        <input ref={photoPicker} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pick} tabIndex={-1} aria-hidden="true" />
        <button className="file-picker" type="button" onClick={() => photoPicker.current?.click()}>
          <span className="file-picker-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v4A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="file-picker-copy">
            <span className="file-picker-title">Выбрать фотографии</span>
            <span className="file-picker-hint">JPEG, PNG или WebP</span>
          </span>
          <span className="file-picker-count">{photos.length} из 3</span>
        </button>
      </div>}</div>
    <Field id="comment" label="Комментарий" err={fe.comment}><textarea id="comment" value={f.comment} onChange={e => set('comment', e.target.value)} /></Field>
    <Field err={fe.consent}>
      <div className="consent">
        <input id="consent" type="checkbox" checked={f.consent} onChange={e => set('consent', e.target.checked)} />
        <div className="consent-copy">
          <label htmlFor="consent">Даю согласие на обработку персональных данных</label>
          <Link href="/privacy">Прочитать политику конфиденциальности</Link>
        </div>
      </div>
    </Field>
    {fe.items && <p className="err" role="alert">{fe.items}</p>}{gen && <p className="err" role="alert">{gen}</p>}
    <button className="btn" disabled={busy || !cart.length || photos.some(p => p.st === 'up')} onClick={send}>{busy ? 'Отправляем…' : 'Отправить заявку'}</button>
    <p className="mute">Дата и время — пожелание, мастер подтвердит запись после разговора. Оплаты онлайн нет.</p></section>;
}
