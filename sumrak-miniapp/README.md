# Сумрак — Telegram Mini App

Отдельный интерфейс заказа по адресу `/miniapp`, использующий существующее Go API и базу данных. Данные `initData` проверяются Go API по токену бота; пароль владельца остаётся прежним и используется на основном сайте `/owner`.

## Локальный запуск

1. Создайте Telegram-бота через [@BotFather](https://t.me/BotFather) и добавьте токен только в корневой `.env`:

   ```dotenv
   TELEGRAM_BOT_TOKEN=токен_бота
   TELEGRAM_MINI_APP_ORIGIN=http://localhost:3001
   ```

2. Запустите PostgreSQL и Go API с корневым `.env`; убедитесь, что основной сайт работает на `http://localhost:3000`.
3. Скопируйте `.env.example` в `.env.local` и запустите приложение:

   ```powershell
   Copy-Item .env.example .env.local
   npm install
   npm run dev -- --port 3001
   ```

4. В BotFather настройте URL Mini App на публичный HTTPS-адрес. Telegram не запускает Mini App с обычного локального HTTP-адреса; для локальной проверки используйте HTTPS-туннель и укажите его origin в `TELEGRAM_MINI_APP_ORIGIN`.

Защищённые маршруты Mini App: `/api/telegram/pricing`, `/api/telegram/quote`, `/api/telegram/orders`, `/api/telegram/photos`. Обычные публичные маршруты и кабинет владельца не меняются.

Токен бота — секрет сервера. Не добавляйте его в `NEXT_PUBLIC_*`, frontend, Docker build args или Git.
