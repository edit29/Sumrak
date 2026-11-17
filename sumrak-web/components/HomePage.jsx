'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { useEffect, useRef, useState } from 'react';
import OrderForm from './OrderForm';
import {
  COLORS, LIGHTS, NAME, REMOVAL_ELEMENTS, SERVICES,
  TYPES, VLT, WINDOWS, label, normalizeColor, rub, api,
} from '../lib/config';

const Car = dynamic(() => import('./Car'), { ssr: false, loading: () => <div className="stage" /> });
const J = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
const DEF = { type: 'sedan', windows: [], lights: [], vlt: '30', color: 'green', note: '' };
const TINT_LIGHTS = LIGHTS;

function PriceRows({ items, rates }) {
  return Object.entries(items).map(([key, title]) =>
    <div className="row item" key={key}><span>{title}</span><b>{rub(rates[key])}</b></div>);
}

function restoreTintConfig(value) {
  const restored = { ...DEF, ...value };
  delete restored.quality;
  restored.color = normalizeColor(restored.color);
  const windows = Array.isArray(restored.windows) ? restored.windows : [];
  const lights = Array.isArray(restored.lights) ? restored.lights : [];
  restored.windows = windows.slice(0, 1);
  restored.lights = restored.windows.length ? [] : lights.slice(0, 1);
  return restored;
}

function restoreCartItems(items, defaultType) {
  return items.flatMap(item => {
    const restored = { ...item, type: item.type || defaultType, qty: 1 };
    const service = restored.service || 'tint';
    const parts = service === 'booking' || service === 'removal'
      ? (restored.elements || []).map(element => ({ elements: [element] }))
      : restored.type === 'other'
        ? null
        : [
          ...(restored.windows || []).map(window => ({ windows: [window], lights: [] })),
          ...(restored.lights || []).map(light => ({ windows: [], lights: [light] })),
        ];
    if (!parts || parts.length <= 1) return [restored];
    return parts.map(part => {
      const single = { ...restored, ...part };
      const { k, ...identity } = single;
      return { ...single, k: JSON.stringify(identity) };
    });
  });
}

function elementTarget(element) {
  if (Object.prototype.hasOwnProperty.call(WINDOWS, element)) return `window:${element}`;
  if (Object.prototype.hasOwnProperty.call(LIGHTS, element)) return `light:${element}`;
  return `element:${element}`;
}

function targetKeys(item) {
  const service = item.service || 'tint';
  if (service === 'booking' || service === 'removal') {
    return (item.elements || []).map(elementTarget);
  }
  if (item.type === 'other') return [];
  return [
    ...(item.windows || []).map(elementTarget),
    ...(item.lights || []).map(elementTarget),
  ];
}

const targetLabel = target => {
  const [kind, element] = target.split(':');
  return kind === 'window' ? WINDOWS[element] : kind === 'light' ? LIGHTS[element] : element;
};

const Chips = ({ items, on, pick, sw, disabled }) => <div className="chips">{Object.entries(items).map(([k, v]) =>
  <button key={k} className="chip" aria-pressed={on(k)} aria-label={sw ? v[0] : undefined} disabled={disabled?.(k) && !on(k)} onClick={() => pick(k)}>{sw ? <span style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', background: '#' + v[1].toString(16).padStart(6, '0') }} /> : v}</button>)}</div>;

function ServiceParts({ selected, setSelected, occupiedTargets }) {
  const pick = key => setSelected(current => current.includes(key) ? [] : [key]);
  return <section className="card">
    <h2>Стекла</h2>
    <Chips items={WINDOWS} on={key => selected.includes(key)} disabled={key => occupiedTargets.has(elementTarget(key))} pick={pick} />
    <h2 style={{ marginTop: '1rem' }}>Фары и задние фонари</h2>
    <Chips items={LIGHTS} on={key => selected.includes(key)} disabled={key => occupiedTargets.has(elementTarget(key))} pick={pick} />
    {selected.length > 0 && <p className="mute">Выбрано: {selected.map(element => REMOVAL_ELEMENTS[element]).join(', ')}</p>}
    {occupiedTargets.size > 0 && <p className="mute">Элементы, уже добавленные в заказ, нельзя выбрать повторно.</p>}
  </section>;
}

export default function Page() {
  const [cfg, setCfg] = useState(DEF), [service, setService] = useState('tint');
  const [bookingParts, setBookingParts] = useState([]), [removalParts, setRemovalParts] = useState([]);
  const [cart, setCart] = useState([]), [form, setForm] = useState({ name: '', phone: '', wishDate: '', wishTime: '', comment: '', consent: false });
  const [carName, setCarName] = useState('');
  const [q, setQ] = useState(null), [one, setOne] = useState(null), [initialized, setInitialized] = useState(false);
  const [priceList, setPriceList] = useState(null), [priceListError, setPriceListError] = useState('');
  const key = useRef(''), priceDialog = useRef(null);

  useEffect(() => {
    let active = true;
    api('/pricing')
      .then(value => {
        const maps = [
          [value?.windows, WINDOWS],
          [value?.lights, TINT_LIGHTS],
          [value?.booking, REMOVAL_ELEMENTS],
          [value?.removal, REMOVAL_ELEMENTS],
        ];
        if (!maps.every(([rates, items]) => rates && Object.keys(items).every(element => Number.isFinite(rates[element])))) {
          throw new Error('Сервер вернул неполный прайс.');
        }
        if (active) setPriceList(value);
      })
      .catch(error => { if (active) setPriceListError(error.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sumrak') || '{}');
      const defaultType = saved.cfg?.type || DEF.type;
      if (Array.isArray(saved.cart)) setCart(restoreCartItems(saved.cart, defaultType));
      if (typeof saved.carName === 'string') setCarName(saved.carName);
      if (saved.form) setForm(saved.form);
      if (saved.cfg) setCfg(restoreTintConfig(saved.cfg));
      if (Object.prototype.hasOwnProperty.call(SERVICES, saved.service)) setService(saved.service);
      if (Array.isArray(saved.bookingParts)) setBookingParts(saved.bookingParts.slice(0, 1));
      if (Array.isArray(saved.removalParts)) setRemovalParts(saved.removalParts.slice(0, 1));
      key.current = saved.key || '';
    } catch (error) {
      console.error('Не удалось восстановить черновик заказа.', error);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    try {
      localStorage.setItem('sumrak', JSON.stringify({ cart, form, cfg, service, bookingParts, removalParts, carName, key: key.current }));
    } catch (error) {
      console.error('Не удалось сохранить черновик заказа.', error);
    }
  }, [initialized, cart, form, cfg, service, bookingParts, removalParts, carName]);

  const other = service === 'tint' && cfg.type === 'other';
  const selection = service === 'booking'
    ? { service, type: cfg.type, elements: [...bookingParts].sort(), qty: 1 }
    : service === 'removal'
      ? { service, type: cfg.type, elements: [...removalParts].sort(), qty: 1 }
      : {
        ...cfg,
        service: 'tint',
        windows: other ? [] : [...(cfg.windows || [])].sort(),
        lights: other ? [] : [...(cfg.lights || [])].sort(),
        color: cfg.vlt === 'ath' ? cfg.color : '',
        note: other ? (cfg.note || '').trim() : '',
        qty: 1,
      };
  const selectionKey = JSON.stringify(selection);
  const selectedTargets = targetKeys(selection);
  const occupiedTargets = new Set(cart.flatMap(targetKeys));
  const selectedOverlap = selectedTargets.filter(target => occupiedTargets.has(target));
  const manualKey = JSON.stringify({ service: 'tint', type: 'other', note: (selection.note || '').toLowerCase() });
  const positionKey = item => item.type === 'other' && (item.service || 'tint') === 'tint'
    ? JSON.stringify({ service: 'tint', type: 'other', note: (item.note || '').trim().toLowerCase() })
    : item.k || JSON.stringify(item);
  const duplicateOther = other && cart.some(item => positionKey(item) === manualKey);
  const seenTargets = new Set();
  const duplicateCartPosition = cart.some(item => targetKeys(item).some(target => {
    if (seenTargets.has(target)) return true;
    seenTargets.add(target);
    return false;
  }));
  const duplicateCartItem = cart.some((item, index) => cart.findIndex(otherItem => positionKey(otherItem) === positionKey(item)) !== index);
  const hasCartConflict = duplicateCartPosition || duplicateCartItem;
  const selectedCount = service === 'booking' || service === 'removal'
    ? selection.elements.length
    : other ? Number(Boolean(selection.note)) : selection.windows.length + selection.lights.length;
  const hasSelection = selectedCount === 1;
  const canAdd = hasSelection && !hasCartConflict && !selectedOverlap.length && (!other || !duplicateOther);
  const item = value => ({
    ...value,
    service: value.service || 'tint',
    windows: value.type === 'other' ? [] : value.windows || [],
    lights: value.type === 'other' ? [] : value.lights || [],
    qty: 1,
  });

  useEffect(() => {
    if (!initialized) return;
    if (!canAdd) { setOne(null); return; }
    let active = true;
    api('/quote', { ...J, body: JSON.stringify({ items: [item(selection)] }) })
      .then(result => { if (active) setOne(result.items[0]?.manual ? 'manual' : result.items[0]?.unit ?? null); })
      .catch(() => { if (active) setOne(null); });
    return () => { active = false; };
  }, [initialized, selectionKey, canAdd]);

  useEffect(() => {
    if (!initialized) return;
    if (!cart.length) { setQ(null); return; }
    let active = true;
    api('/quote', { ...J, body: JSON.stringify({ items: cart.map(item) }) })
      .then(result => { if (active) setQ(result); })
      .catch(() => { if (active) setQ(null); });
    return () => { active = false; };
  }, [cart, initialized]);

  const add = () => {
    if (!canAdd) return;
    setCart(items => [...items, { k: selectionKey, ...selection }]);
    if (service === 'booking') setBookingParts([]);
    else if (service === 'removal') setRemovalParts([]);
    else setCfg(current => ({ ...current, windows: [], lights: [], note: other ? '' : current.note }));
  };
  const remove = index => {
    setCart(items => items.filter((_, itemIndex) => itemIndex !== index));
  };

  return <main>
    <header className="row" style={{ gridColumn: '1 / -1' }}>
      <h1 style={{ gridColumn: 'auto', flex: '1 1 24rem' }}>{NAME} — бронирование, тонирование и растонирование</h1>
      <ThemeToggle />
      <Link href="/owner" className="btn btn-link">Вход в кабинет</Link>
    </header>
    <Car type={cfg.type} wins={service === 'tint' ? cfg.windows || [] : []} lights={service === 'tint' ? cfg.lights || [] : []} vlt={cfg.vlt} color={cfg.color} cart={cart} />
    <div>
      <section className="card">
        <div className="form-field">
          <label htmlFor="car-name">Название автомобиля</label>
          <input id="car-name" maxLength={100} placeholder="Например, Toyota Camry" value={carName} onChange={event => setCarName(event.target.value)} />
        </div>
        <h2>Тип автомобиля</h2><Chips items={TYPES} on={key => cfg.type === key} pick={key => setCfg({ ...cfg, type: key })} />
        {other && <><textarea placeholder="Опишите автомобиль и что нужно затонировать" value={cfg.note} onChange={event => setCfg({ ...cfg, note: event.target.value })} /><p className="mute">Цену назовёт мастер. Загрузка фото появится вместе с серверной частью фото.</p></>}
      </section>

      <section className="card">
        <h2>Услуга</h2>
        <Chips items={SERVICES} on={key => service === key} pick={setService} />
      </section>

      <section className="card">
        <button className="chip price-trigger" type="button" aria-haspopup="dialog" aria-controls="price-dialog" onClick={() => priceDialog.current?.showModal()}>Стоимость услуг</button>
      </section>

      <dialog ref={priceDialog} id="price-dialog" className="price-dialog" aria-labelledby="price-dialog-title">
        <div className="price-dialog-content">
          <div className="row price-dialog-header">
            <h2 id="price-dialog-title">Стоимость услуг</h2>
            <button className="chip" type="button" onClick={() => priceDialog.current?.close()}>Закрыть</button>
          </div>
          {priceListError ? <p className="err" role="alert">Не удалось загрузить прайс: {priceListError}</p>
            : !priceList ? <p className="mute">Загружаем прайс…</p>
              : <>
                <h3>Бронирование</h3>
                <PriceRows items={WINDOWS} rates={priceList.booking} />
                <PriceRows items={LIGHTS} rates={priceList.booking} />
                <h3>Тонирование</h3>
                <PriceRows items={WINDOWS} rates={priceList.windows} />
                <PriceRows items={TINT_LIGHTS} rates={priceList.lights} />
                <p className="mute">Базовая стоимость тонирования умножается только на коэффициент типа автомобиля. Светопропускание и цвет плёнки на цену не влияют.</p>
                <h3>Растонирование</h3>
                <PriceRows items={REMOVAL_ELEMENTS} rates={priceList.removal} />
                <p className="mute">Услуга «Другое» оценивается мастером индивидуально.</p>
              </>}
        </div>
      </dialog>

      {service === 'booking' && <ServiceParts selected={bookingParts} setSelected={setBookingParts} occupiedTargets={occupiedTargets} />}

      {service === 'tint' && <>
        {!other && <section className="card">
          <h2>Стекла</h2>
          <Chips items={WINDOWS} on={key => (cfg.windows || []).includes(key)} disabled={key => occupiedTargets.has(elementTarget(key))} pick={key => setCfg(current => ({
            ...current,
            windows: (current.windows || []).includes(key) ? [] : [key],
            lights: [],
          }))} />
          <h2 style={{ marginTop: '1rem' }}>Фары и задние фонари</h2>
          <Chips items={TINT_LIGHTS} on={key => (cfg.lights || []).includes(key)} disabled={key => occupiedTargets.has(elementTarget(key))} pick={key => setCfg(current => ({
            ...current,
            windows: [],
            lights: (current.lights || []).includes(key) ? [] : [key],
          }))} />
          {occupiedTargets.size > 0 && <p className="mute">Элементы, уже добавленные в заказ, нельзя выбрать повторно.</p>}
          <h2 style={{ marginTop: '1rem' }}>Светопропускание</h2><Chips items={VLT} on={key => cfg.vlt === key} pick={key => setCfg({ ...cfg, vlt: key })} />
          {cfg.vlt === 'ath' && <><h2 style={{ marginTop: '1rem' }}>Цвет плёнки</h2><Chips sw items={COLORS} on={key => cfg.color === key} pick={key => setCfg({ ...cfg, color: key })} /></>}
        </section>}
      </>}

      {service === 'removal' && <ServiceParts selected={removalParts} setSelected={setRemovalParts} occupiedTargets={occupiedTargets} />}

      <section className="card row"><div><div className="mute">Эта позиция</div><div className="price">{one === 'manual' ? 'по оценке мастера' : one == null ? (hasSelection ? '…' : 'выберите один элемент') : rub(one)}</div>
        {selectedOverlap.length > 0 && <p className="err" role="status">Уже в заказе: {selectedOverlap.map(targetLabel).join(', ')}.</p>}
        {duplicateOther && <p className="err" role="status">Такая позиция уже есть в заказе.</p>}
        {hasCartConflict && <p className="err" role="alert">В заказе повторяются элементы. Удалите лишнюю позицию.</p>}
      </div><button className="btn" onClick={add} disabled={!canAdd}>В заказ</button></section>

      <section className="card"><h2>Заказ</h2>
        {hasCartConflict && <p className="err" role="alert">В заказе есть повторяющиеся позиции. Удалите дубли перед отправкой.</p>}
        {!cart.length ? <p className="mute">Заказ пуст. Выберите тип автомобиля, услугу и один элемент, затем нажмите «В заказ».</p> : cart.map((value, index) => <div className="item" key={value.k}><div>{label(value)}</div>
          <div className="row"><b>{q?.items[index] ? (q.items[index].manual ? 'оценка мастера' : rub(q.items[index].unit)) : '…'}</b></div>
          <div className="row"><button className="chip" onClick={() => remove(index)}>Удалить</button></div></div>)}
        {q && <div style={{ marginTop: '.5rem' }}><div className="mute">Известная сумма</div><div className="price">{rub(q.known_total)}</div>{q.manual_count > 0 && <div className="mute">+ {q.manual_count} поз. по оценке мастера. Итог согласует мастер.</div>}</div>}
      </section>
      <OrderForm cart={cart} carName={carName} />
    </div>
  </main>;
}
