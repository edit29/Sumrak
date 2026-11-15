'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sumrak-theme';
const themeColor = { light: '#f3f5f8', dark: '#0e1319' };

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor[theme]);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    let saved = 'light';
    try {
      saved = localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch (error) {
      console.error('Не удалось прочитать сохранённую тему:', error);
    }
    applyTheme(saved);
    setTheme(saved);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      console.error('Не удалось сохранить тему:', error);
    }
  }

  return (
    <button
      className="chip theme-toggle"
      type="button"
      aria-pressed={theme === 'dark'}
      aria-label={`Включить ${theme === 'dark' ? 'светлую' : 'тёмную'} тему`}
      onClick={toggle}
    >
      {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
    </button>
  );
}
