'use client';
import { useEffect, useRef, useState } from 'react';

const TIME_SLOTS = Array.from({ length: 45 }, (_, index) => {
  const minutes = 9 * 60 + index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
const pad = value => String(value).padStart(2, '0');
const parseDate = value => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
export const dateValue = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const addDays = (value, days) => {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return dateValue(date);
};
export const availableTimes = (date, today) => TIME_SLOTS.filter(time => {
  if (date !== today) return true;
  const [hour, minute] = time.split(':').map(Number);
  const now = new Date();
  return hour * 60 + minute > now.getHours() * 60 + now.getMinutes();
});
const dateLabel = value => new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long', day: 'numeric', month: 'long',
}).format(parseDate(value));

export default function DateTimePicker({ date, time, onChange, id = 'wishDate' }) {
  const dialog = useRef(null), [today, setToday] = useState(''), [week, setWeek] = useState(0), [open, setOpen] = useState(false);
  const titleId = `${id}-title`;
  useEffect(() => setToday(dateValue(new Date())), []);
  const dates = today ? Array.from({ length: 14 }, (_, index) => addDays(today, index)) : [];
  const visibleDates = dates.slice(week * 7, week * 7 + 7);
  const heading = visibleDates.length
    ? new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(parseDate(visibleDates[0]))
    : '';
  const zone = today ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
  const offset = today ? -parseDate(date || today).getTimezoneOffset() : 0;
  const zoneLabel = today
    ? `Часовой пояс: ${zone} (UTC${offset < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)})`
    : 'Местное время устройства';
  const openPicker = () => {
    const index = dates.indexOf(date);
    setWeek(index >= 7 ? 1 : 0);
    dialog.current?.showModal();
    setOpen(true);
  };
  const chooseDate = value => onChange(value, availableTimes(value, today).includes(time) ? time : '');
  const chooseTime = value => {
    onChange(date, value);
    dialog.current?.close();
  };
  const selectionLabel = date && time ? `${dateLabel(date)} · ${time}` : date ? `${dateLabel(date)} · выберите время` : 'Выберите дату и время';

  return <>
    <button id={id} type="button" className="datetime-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={openPicker}>
      <span>{selectionLabel}</span><span aria-hidden="true">▦</span>
    </button>
    <dialog ref={dialog} className="datetime-dialog" aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={event => {
      if (event.target === dialog.current) dialog.current.close();
    }}>
      <div className="datetime-content">
        <div className="datetime-header">
          <div><h2 id={titleId}>Выберите дату и время</h2><p className="mute">{zoneLabel}</p></div>
          <button type="button" className="chip datetime-close" aria-label="Закрыть" onClick={() => dialog.current?.close()}>×</button>
        </div>
        <div className="datetime-week-nav">
          <button type="button" className="chip" aria-label="Предыдущие даты" disabled={week === 0} onClick={() => setWeek(0)}>‹</button>
          <b>{heading}</b>
          <button type="button" className="chip" aria-label="Следующие даты" disabled={week === 1} onClick={() => setWeek(1)}>›</button>
        </div>
        <div className="datetime-days" aria-label="Дата">
          {visibleDates.map(value => {
            const day = parseDate(value);
            return <button key={value} type="button" className="datetime-day" aria-pressed={date === value}
              disabled={!availableTimes(value, today).length} onClick={() => chooseDate(value)}>
              <span>{new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(day).replace('.', '')}</span>
              <strong>{day.getDate()}</strong>
              <span>{new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(day).replace('.', '')}</span>
            </button>;
          })}
        </div>
        {date
          ? <><h3 className="datetime-date-title">{dateLabel(date)}</h3>
            <div className="datetime-times" aria-label="Время">
              {availableTimes(date, today).map(value => <button key={value} type="button" className="datetime-time" aria-pressed={time === value} onClick={() => chooseTime(value)}>{value}</button>)}
            </div></>
          : <p className="mute">Выберите день, чтобы выбрать время.</p>}
        {(date || time) && <div className="datetime-actions">
          <button type="button" className="chip" onClick={() => { onChange('', ''); dialog.current?.close(); }}>Очистить выбор</button>
        </div>}
      </div>
    </dialog>
  </>;
}
