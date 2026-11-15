# Сумрак API (Go + PostgreSQL)

Для локального запуска API из папки `sumrak-api` выполните `go run .`. API загружает `.env` из текущей папки или, если его там нет, из родительской папки (корень проекта). В файле должны быть заданы `DATABASE_URL`, `ALLOWED_ORIGIN` и `OWNER_PASSWORD`. Для Telegram Mini App также задайте `TELEGRAM_BOT_TOKEN`; локальный origin Mini App по умолчанию — `http://localhost:3001`. Уже установленные переменные окружения имеют приоритет над значениями из `.env`.

В Docker Compose переменные передаются контейнеру из корневого `.env`; после его изменения пересоздайте API командой `docker compose up -d --force-recreate api`. Перед публикацией задайте сильный уникальный `OWNER_PASSWORD` и production-адрес `ALLOWED_ORIGIN`.

Публичные эндпоинты: GET /api/pricing, POST /api/quote, POST /api/orders (заголовок Idempotency-Key, 16–80 символов), GET /api/orders/{token}. Telegram Mini App использует защищённые GET `/api/telegram/pricing` и POST `/api/telegram/quote`, `/api/telegram/orders`, `/api/telegram/photos`; каждый запрос содержит `X-Telegram-Init-Data`, проверяемый сервером с помощью токена бота. Токен хранится только в окружении API и не передаётся фронтенду.
Прайс хранится в строке `pricing` таблицы `settings`; каждая заявка сохраняет свой снимок. Клиент загружает ставки через GET `/api/pricing`, расчёт выполняет сервер. Каждая позиция заказа содержит один элемент; несколько элементов добавляются отдельными позициями.

## Деплой на VPS

Корневой `compose.yaml` запускает PostgreSQL, Go API, Next.js в standalone-режиме и Caddy с автоматическим HTTPS. База и API доступны только во внутренней Docker-сети; наружу открыты только порты 80/443.

1. Создайте бота через @BotFather и настройте его Menu Button или Main Mini App на `https://ваш-домен/miniapp`. Затем установите на VPS Docker Engine с плагином Docker Compose, направьте DNS-записи домена на VPS и откройте входящие порты 80 и 443.
2. Создайте на VPS `/opt/sumrak/.env` по образцу корневого `.env.example`. Укажите нижний регистр владельца GitHub в `GHCR_OWNER`, домен без схемы в `SITE_DOMAIN`, полный `https://` URL в `PUBLIC_SITE_URL`, уникальные `POSTGRES_PASSWORD` и `OWNER_PASSWORD`, а также выданный BotFather `TELEGRAM_BOT_TOKEN`. Для пароля PostgreSQL используйте hex-строку, чтобы URL подключения был корректным. Ограничьте доступ к файлу (`chmod 600`).
3. В настройках репозитория GitHub задайте variable `PUBLIC_SITE_URL` с тем же HTTPS-адресом. Создайте secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY_B64`, `DEPLOY_KNOWN_HOSTS` и `GHCR_READ_TOKEN` (токен с правом `read:packages`). `DEPLOY_SSH_KEY_B64` — Base64-кодированное содержимое незашифрованного приватного OpenSSH-ключа; в Windows PowerShell скопируйте его в буфер командой `[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\.ssh\sumrak_deploy_v2")) | Set-Clipboard`. Вставляйте его только в GitHub Secret, не в чат. Опциональные variables: `DEPLOY_PATH` (по умолчанию `/opt/sumrak`) и `GHCR_USERNAME`.
4. Workflow `.github/workflows/deploy.yml` запускает Go-тесты и production-сборку основного сайта и Mini App на pull request. Push в `main` дополнительно публикует образы в GHCR и разворачивает их на VPS по SSH. Серверу должны быть доступны Docker Compose и указанный путь для деплоя.

Workflow передаёт на VPS `compose.yaml`, `Caddyfile` и схему для новой базы; файл `.env` остаётся только на сервере. SQL в `schema.sql` автоматически применяется только при первом создании пустого тома PostgreSQL. Для уже работающей базы применяйте нужные миграции отдельно. Том `postgres_data` сохраняет данные контейнера, но не заменяет резервные копии базы.

Тарифы в рублях: бронирование — лобовое/заднее стекло 2 000, боковые стёкла по 1 000, фары и задние фонари по 1 000; растонирование — те же цены. Базовые тарифы тонировки вдвое выше: лобовое/заднее — 4 000, боковые — 2 000, фары и задние фонари — по 2 000. Итог тонировки умножается только на коэффициент типа автомобиля; светопропускание и цвет плёнки на цену не влияют.

Для новой базы используются значения из `schema.sql`. Чтобы обновить существующую базу, выполните миграцию:

    Get-Content .\pricing-update.sql | docker compose exec -T db psql -U postgres -d sumrak

Миграция обновляет тарифы услуг и удаляет множитель качества плёнки, сохраняя остальные настройки прайса. Для последующих изменений обновляйте значения в `settings`; старые заявки сохраняют свой снимок.

Чтобы удалить из прайса существующей базы устаревшие коэффициенты светопропускания, выполните миграцию:

    Get-Content .\vlt-multiplier-migration.sql | docker compose exec -T db psql -U postgres -d sumrak

Для сохранения названия автомобиля в существующей базе выполните:

    Get-Content .\car-name-migration.sql | docker compose exec -T db psql -U postgres -d sumrak

## Структура кода

Один пакет `main`, файлы разложены по назначению. Все REST-маршруты описаны в одном месте — `routes.go`.

| Файл | Что внутри |
| --- | --- |
| `main.go` | Запуск: подключение к БД и HTTP-сервер |
| `routes.go` | Таблица маршрутов (метод + путь → обработчик) |
| `config.go` | Переменные окружения и подключение к БД |
| `middleware.go` | `guard` (Origin, лимит запросов, размер тела) и `auth` (сеанс владельца) |
| `response.go` | Единый формат ответов и ошибок |
| `models.go` | Структуры `Pricing`, `Item`, `Order` |
| `pricing.go` | Расчёт цены на сервере, проверка позиций, итоги |
| `security.go` | Случайные токены и хеширование |
| `health.go` | `GET /healthz` |
| `telegram_auth.go` | Проверка подписи, срока действия и целостности Telegram `initData` |
| `handlers_pricing.go` | `GET /api/pricing`, `POST /api/quote` |
| `handlers_orders.go` | `POST /api/orders`, `GET /api/orders/{token}` |
| `handlers_photos.go` | `POST /api/photos`, `GET /api/owner/photos/{id}` |
| `handlers_owner_auth.go` | `POST /api/owner/login`, `POST /api/owner/logout` |
| `handlers_owner_orders.go` | `GET/PATCH/DELETE /api/owner/orders` |
| `main_test.go` | Тесты расчёта цены и разбора заявки |
