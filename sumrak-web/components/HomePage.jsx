'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [noPosition, setNoPosition] = useState({ left: 44, top: 45 });
  const [declined, setDeclined] = useState(false);

  function dodge(event) {
    const area = event.currentTarget.parentElement.getBoundingClientRect();
    const button = event.currentTarget.getBoundingClientRect();
    const maxLeft = Math.max(8, area.width - button.width - 8);
    const maxTop = Math.max(8, area.height - button.height - 8);
    setNoPosition({
      left: 8 + Math.random() * Math.max(1, maxLeft - 8),
      top: 8 + Math.random() * Math.max(1, maxTop - 8),
    });
  }

  if (declined) {
    return (
      <main className="invite-page invite-declined">
        <div className="ambient-glow glow-a" /><div className="ambient-glow glow-b" />
        <div className="invite-card decline-card">
          <h1>Спасибо, что<br /><span>ответили честно.</span></h1>
          <p className="invite-copy">Хорошего вам дня ♡</p>
        </div>
      </main>
    );
  }

  return (
    <main className="invite-page">
      <div className="ambient-glow glow-a" /><div className="ambient-glow glow-b" /><div className="ambient-glow glow-c" />
      <header className="invite-topbar"><span className="invite-brand"><span>✳</span> A LITTLE INVITATION</span></header>
      <section className="invite-hero">
        <div className="hero-orb" aria-hidden="true"><span>🦝</span></div>
        <p className="eyebrow">У МЕНЯ ЕСТЬ К ТЕБЕ ОДИН ВОПРОС</p>
        <h1>Aceptarías  tener<br />una cita <span>conmigo?</span></h1>
        <p className="invite-copy">Согласитесь ли пойти со мной на свидание?</p>
        <p className="invite-copy">Я придумал несколько идей для нашего дня. Но сначала хочу узнать самое главное.</p>
        <div className="answer-area">
          <button className="yes-button" onClick={() => router.push('/date')}>Да <span>♥</span></button>
          <div className="no-zone" aria-label="Кнопка Нет">
            <button className="no-button" style={{ left: `${noPosition.left}px`, top: `${noPosition.top}px` }} onMouseEnter={dodge} onMouseMove={dodge} onFocus={dodge} onClick={dodge}>Нет</button>
          </div>
        </div>
        <button className="decline-link" onClick={() => setDeclined(true)}>Нет</button>
      </section>
      <footer className="invite-footer"><span>MADE WITH A LITTLE COURAGE</span><span>♡</span><span>NO PRESSURE, JUST AN INVITATION</span></footer>
    </main>
  );
}
