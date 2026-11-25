'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRef, useEffect  } from 'react';

const categories = [
  {
    label: 'Первое впечатление',
    options: [
      { id: 'coffee', title: 'Кофейня', icon: '☕', description: 'Начнём встречу с кофе и приятного разговора.' },
      { id: 'fast-food', title: 'Фастфуд', icon: '🍔', description: 'Обед в бургер кинге, кфс, маке, суши' },
      { id: 'short-walk', title: 'Короткая прогулка', icon: '🚶', description: 'Немного пройдемся по улице' },
    ],
  },
  {
    label: 'Вдохновение',
    options: [
      { id: 'twilight', title: 'Фильм «Сумерки» в кино', icon: '🎬', description: 'Смотрим фильм в кинотеатре с крутыми креслами' },
      { id: 'wheel', title: 'Колесо обозрения', icon: '🎡', description: 'Покатаемся на колесе обозрения на набережной' },
      { id: 'museum', title: 'Музей', icon: '🏛️', description: 'Сходим в прикольный музей' },
      { id: 'park', title: 'Прогулка в парке', icon: '🌳', description: 'Неспешная прогулка и время вдвоём' },
      { id: 'art-exhibition', title: 'Выставка картин', icon: '🖼️', description: 'Посмотрим и пообсуждаем искусство' },
    ],
  },
  {
    label: 'Активная часть',
    options: [
      { id: 'horses', title: 'Прогулка на лошадях', icon: '🐎', description: 'Прогулка верхом на лошадях, без галопа' },
      { id: 'bowling', title: 'Боулинг', icon: '🎳', description: 'Сходим в боулинг и посоревнуемся в метании боеголовок шестерок' },
      { id: 'fireworks-show', title: 'Фейерверк в поле', icon: '🎆', description: 'Я куплю пачку фейерверков и как ебанем их в поляне!' },
      { id: 'karting', title: 'Картинг', icon: '🏎️', description: 'Крытый картинг, есть выбор: каждому по машине или вдвоем на одном карте' },
      { id: 'laser-tag', title: 'Стрельба в тире', icon: '🔫', description: 'Постреляем из пистолетов или штурмовых винтовок в тире' },
      { id: 'dance', title: 'Танцпол для двоих', icon: '💃', description: 'Урок танцу вдвоем' },
    ],
  },
  {
    label: 'Красивое завершение',
    options: [
      { id: 'dinner', title: 'Ужин в ресторане', icon: '🍽️', description: 'Красиво завершим этот день за ужином' },
      { id: 'street-drink', title: 'Вино на улице', icon: '🍷', description: 'Возьмем фастфуд, бутылку вина и поболтаем под открытым небом' },
      { id: 'aroma-massage', title: 'Массаж с аромасвечами', icon: '🕯️', description: 'Сделаю тебе массаж с аромасвечами' },
    ],
  },
];

const defaults = categories.map((category) => category.options[0].id);

const jokes = [
  {
    text: 'На сельской дискотеке банда лесорубов подралась с бандой пекарей, со стороны было не понятно, то ли это заруба, то ли замес'
  },
  {
    text: 'Гея уволили из банка спермы, потому что он слишком часто выпивал на работе'
  },
  {
    text: 'Сидит волк, в руках колобка крутит \n - и куда ж тебя ебать \n спрашивает волк \n колобок отвечает \n - не надо меня ебать \n и волк говорит \n - ух бля откуда сказал '
  },
  {
    text: 'Все животные на шоу талантов, хамелион показывает как он может менять цвета, и осьминог такой говорит: "пфф, подержите моё пиво, подержите моё пиво, подержите моё пиво, подержите моё пиво, подержите моё пиво, подержите моё пиво, подержите моё пиво, подержите моё пиво '
  },
  {
    text: '-мама, что такое чёрный юмор?-сынок, видишь вон там мужчину без рук?скажи ему похлопать в ладоши.-мама! я же слепой.-вот именно.'
  },
  {
    text: 'Мужик спросил мудреца: \n - Как ты дожил до такого возраста?\n - Я никогда не вступал в споры.\n - Это невозможно.\n Монах ответил "возможно" и умер.'
  },
  {
    text: 'Стоит змей горыныч на горке, первая голова говорит третьей \n - слышал второй голове в рот давали \n - пусть дают, главное что не в жопу'
  },
  {
    text: 'Приходит мужик к тату мастеру и говорит: \n - набей мне танк на всю спину \n а он ему говорит \n - ну давай ложись \n проходит 15 минут, мастер говорит \n - ну всё готово \n мужик пытается встать и говорит \n - чёто не получается встать \n ему тату мастер отвечает \n- а хуль ты хотел, 46 тонн епта'
  },
  {
    text: 'Одна пиявка звонит другой и говорит: \n - я тебя не отрываю?'
  },
  {
    text: 'Шёл Штирлиц по улице и увидел лужу. "Похуй" - подумал Штирлици шагнул вперед. "А нет, по уши" - понял он вылезая'
  },
  {
    text: 'Как называется изгнание из фистинг-коммьюнити? Раскулачивание'
  },
  {
    text: 'Созвали собрание животных в лесу, белка говорит: \n - орехов на зиму заготовила \n Лиса говорит: \n - нору вырыла \n Медведь говорит: \n - а у меня батя сгорел'
  }
];

export default function DatePlanner() {
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [route, setRoute] = useState(defaults);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const selected = useMemo(() => route.map((id, index) => categories[index].options.find((item) => item.id === id)), [route]);

  function choose(position, id) {
    setRoute((current) => current.map((value, index) => index === position ? id : value));
    setEditing(null);
  }

  async function confirmRoute() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/date-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route: route.map((activity, index) => ({ position: index + 1, activity })) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Не получилось сохранить маршрут. Попробуй ещё раз.');
      setDone(true);
    } catch (err) {
      setError(err.message || 'Не получилось сохранить маршрут.');
    } finally {
      setSaving(false);
    }
  }

  const openCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
      },
      audio: false,
    });

    streamRef.current = stream;
    setIsOpen(true);
  } catch (error) {
    console.error('Ошибка доступа к камере:', error);
    alert('Не удалось получить доступ к камере');
  }
};

const closeCamera = () => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }

  setIsOpen(false);
};

  useEffect(() => {
  if (isOpen && videoRef.current && streamRef.current) {
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(error => {
      console.error('Ошибка воспроизведения видео:', error);
    });
  }
}, [isOpen]);

  useEffect(() => {
  return () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };
}, []);

  return (
    <main className="planner-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" /><div className="ambient ambient-three" />
      <header className="planner-header">
        <a className="wordmark" href="/">✳ <span>OUR LITTLE DATE</span></a>
      </header>
      {!done ? (
        <>
          <section className="planner-intro">
            <p className="overline big-emoji">🦝</p>
            <h1>Как проведём<br /><span>этот день?</span></h1>
            <p>Я предложил несколько идей, но главный режиссёр этого свидания - Вы. Выбирайте варианты для каждого этапа. P.S.: Заранее ничего не бронировал, после вашего подтверждения оформлю бронь в заведениях.</p>
          </section>
          <section className="route-list" aria-label="Маршрут свидания">
            {selected.map((activity, index) => (
              <article className={`route-card ${editing === index ? 'is-editing' : ''}`} key={index}>
                <div className="route-index">0{index + 1}</div>
                <div className="route-icon">{activity.icon}</div>
                <div className="route-info">
                  <span className="route-label">{categories[index].label}</span>
                  <h2>{activity.title}</h2>
                  <p>{activity.description}</p>
                </div>
                <button className="change-button" onClick={() => setEditing(editing === index ? null : index)}>{editing === index ? 'Закрыть' : 'Изменить'} <span>↗</span></button>
                {editing === index && (
                  <div className="choice-panel">
                    <div className="choice-heading"><strong>Выбери, что тебе больше нравится</strong><span>Этап {index + 1} из 4</span></div>
                    <div className="choice-grid">
                      {categories[index].options.map((option) => (
                        <button key={option.id} className={`choice-option ${route[index] === option.id ? 'is-selected' : ''}`} onClick={() => choose(index, option.id)}>
                          <span className="choice-emoji">{option.icon}</span><span>{option.title}</span>{route[index] === option.id && <b>✓</b>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>
                      <details className="jokes-panel">
              <summary className="jokes-header">
                <div className="jokes-icon">😄</div>

                <div className="jokes-heading">
                  <h2>Может Анекдоты?</h2>
                </div>

                <span className="jokes-arrow">⌄</span>
              </summary>

              <div className="jokes-content">
                {jokes.map((joke, index) => (
                  <article className="joke-item" key={index}>
                    <span className="joke-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                
                    <div>
                      <h3>{joke.title}</h3>
                      <p>{joke.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </details>
          <section className="confirm-panel">
            <div><h2>Вам нравится этот план?</h2></div>
            <button className="primary-button confirm-button" disabled={saving} onClick={confirmRoute}>{saving ? 'Сохраняем…' : 'Подтвердить'} <span>♥</span></button>
            {error && <p className="error-message">{error}</p>}
          </section>
        
        </>
      ) : (
        <section className="success-card">
          <div className="success-spark">❤️</div>
          <h1>Кажется, нас ждёт<br /><span>что-то классное.</span></h1>
          <p>Ваш выбор уже у меня. Спасибо, что собрали его ❤️</p>
          <div className="success-route">{selected.map((item, index) => <div key={item.id + index}><span>0{index + 1}</span>{item.icon} {item.title}</div>)}</div>
          <section className="camera-panel">
  <h2>Прикинь кто мне снился</h2>

  {!isOpen ? (
    <button className="primary-button" onClick={openCamera}>
      Посмотреть 
    </button>
  ) : (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: '100%',
          maxWidth: '600px',
          borderRadius: '12px',
        }}
      />

      <button className="primary-button" onClick={closeCamera}>
        Выключить камеру
      </button>
    </div>
  )}
</section>
        </section>
      )}
    </main>
  );
}
