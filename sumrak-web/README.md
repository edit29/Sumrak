# Сумрак — клиент (Next.js)
    npm install
    npm run dev      # сайт на :3000; настройки берутся из .env.local
У API задайте ALLOWED_ORIGIN=http://localhost:3000 (адрес сайта). Браузер ходит на /api/*, Next проксирует в Go.
Локальные настройки Next.js: `API_URL=http://localhost:8080` и `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Для production укажите адрес Go API и публичный HTTPS-домен.
Docker-образ использует Next.js standalone server; состав сервисов, TLS, CI и деплой на VPS описаны в корневом `compose.yaml` и `sumrak-api/README.md`.
Цены на клиенте не хранятся: показ — только из ответов /api/quote. Корзина и черновик — в localStorage.
Кабинет владельца: /owner (пароль из OWNER_PASSWORD у API).
Telegram Mini App доступен отдельно в `sumrak-miniapp/` и публикуется по адресу `/miniapp`; перед запуском добавьте токен BotFather в `TELEGRAM_BOT_TOKEN` на сервере.

Перед публикацией:
- В `lib/site.js` замените шаблоны контактов, реквизитов, сроков хранения и обработчиков данных; проверьте и дополните политику на странице `/privacy`.
- Укажите публичный адрес сайта в `sumrak-web/.env.local`, например `NEXT_PUBLIC_SITE_URL=https://ваш-домен.ru`. Он используется в метаданных, `robots.txt` и карте сайта.
- PWA устанавливается из браузера на HTTPS-сайте (или localhost). Service worker включён только в production; офлайн-режим показывает страницу-заглушку. API, кабинет владельца и приватные ссылки заявок не кэшируются.

Не сделано: кабинет клиента, Figma/Blender/лицензии моделей.
