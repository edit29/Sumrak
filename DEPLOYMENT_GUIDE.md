# Полный гайд по деплою «Сумрак» на VPS через GitHub Actions

Инструкция описывает текущую конфигурацию проекта: Debian 13, Docker Compose, GitHub Container Registry (GHCR), GitHub Actions и два варианта домена: бесплатный DuckDNS или купленный домен (например, зарегистрированный на REG.RU). Основной сайт, Go API, PostgreSQL, Telegram Mini App и HTTPS запускаются через один `compose.yaml`.

Для этого проекта используются:

- GitHub: `edit29/Sumrak`, ветка `main`;
- вариант домена 1 (DuckDNS): `sumrakapp.duckdns.org`;
- вариант домена 2 (купленный домен): выбранное тобой имя, например `mydomain.ru`;
- каталог приложения на сервере: `/opt/sumrak`;
- внешний адрес сайта: `https://<ВАШ_ДОМЕН>`;
- SSH-порт по умолчанию: `22`.

Если у тебя другие имя репозитория, домен, путь или порт, замени их во всех соответствующих местах. Workflow в текущем виде подключается по стандартному SSH-порту 22.

> **Важно о секретах.** Не отправляй пароли, токены, приватные ключи или содержимое `.env` в чаты, скриншоты, GitHub Issues и Git. Если секрет уже попал в такое место, отзови или смени его. Используй разные уникальные пароли для владельца сайта и PostgreSQL.

## 1. Подготовить VPS и сетевые правила

После покупки VPS сохрани его публичный IPv4-адрес. В панели хостинга выбери Debian 13 (или Debian 12, если 13 недоступен) и задай надёжный пароль администратора. Пароль обычно показывается только при создании/переустановке сервера — сохрани его в менеджере паролей.

В панели firewall/security group разреши входящие соединения:

| Протокол | Порт | Для чего |
|---|---:|---|
| TCP | 22 | SSH, Termius и GitHub Actions |
| TCP | 80 | HTTP и получение HTTPS-сертификата |
| TCP | 443 | HTTPS-сайт и Mini App |
| UDP | 443 | Необязательно; HTTP/3 в Caddy |

Не закрывай SSH-порт, через который сейчас подключён. Не включай UFW, пока не добавил разрешение для своего SSH-порта и не проверил доступ из второго подключения.

## 2. Подключиться через Termius и обновить сервер

Создай в Termius Host:

- **Address/Host**: публичный IPv4 VPS;
- **Port**: `22`, если в панели хостинга не задан другой;
- **Username**: пользователь администратора из панели;
- **Password** или ключ: данные, выданные хостингом.

Подключись и проверь, под кем открылась сессия:

```bash
whoami
```

Обнови Debian и установи нужные утилиты:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl gnupg nano openssh-server openssl
sudo systemctl enable --now ssh
```

Если ты вошёл непосредственно как `root`, убери `sudo` из команд, где он используется. Убедись, что SSH-сервис активен:

```bash
sudo systemctl status ssh --no-pager
```

Для продолжения понадобятся две учётные записи:

- твоя административная учётная запись для Termius;
- отдельный пользователь `deploy` для автоматического деплоя из GitHub Actions.

Создай пользователя `deploy` и каталог приложения:

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo install -d -o deploy -g deploy -m 755 /opt/sumrak
```

Пользователь `deploy` будет выполнять Docker-команды из CI. Членство в группе `docker` фактически даёт права уровня root — используй эту учётную запись только для деплоя и не используй её для посторонних задач.

## 3. Установить Docker Engine и Compose

Добавь официальный репозиторий Docker для Debian:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

Добавь источник пакетов Docker:

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Установи Docker Engine, Buildx и Compose plugin:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run hello-world
sudo docker compose version
```

Добавь `deploy` в группу Docker:

```bash
sudo usermod -aG docker deploy
```

Изменение групп начнёт действовать после нового SSH-подключения пользователя. После настройки ключа ниже переподключись в Termius под `deploy` и проверь:

```bash
whoami
docker ps
docker compose version
```

Первая команда должна показать `deploy`; `docker ps` должен выполниться без `sudo`.

## 4. Выбрать вариант домена и направить его на VPS

Выбери один вариант и настрой его до первого деплоя. В дальнейшем во всех местах используй один и тот же hostname:

- для DuckDNS: `sumrakapp.duckdns.org`;
- для купленного домена: например, `mydomain.ru` или выбранный поддомен вроде `app.mydomain.ru`.

В `SITE_DOMAIN` указывается только hostname — без `https://`, пути и завершающего `/`. В `PUBLIC_SITE_URL` указывается полный URL с `https://`.

### Вариант 1 — бесплатный поддомен DuckDNS

1. На [duckdns.org](https://www.duckdns.org/) войди в аккаунт и создай поддомен, например `sumrakapp`.
2. Укажи публичный IPv4-адрес своего VPS. Полное доменное имя будет `sumrakapp.duckdns.org`.
3. Проверь DNS на Windows в PowerShell:

   ```powershell
   nslookup sumrakapp.duckdns.org
   ```

В ответе должен быть IP-адрес VPS. Если провайдер сменит адрес, обнови его в DuckDNS. Пока имя не указывает на VPS, не запускай настройку HTTPS.

### Вариант 2 — купленный домен, например на REG.RU

Покупать отдельный хостинг у регистратора не требуется: сайт будет работать на VPS. Нужны зарегистрированный домен и возможность управлять его DNS-записями.

1. На REG.RU зарегистрируй домен и подтверди контактные данные, если этого потребует регистратор. Дождись, пока домен получит статус активного.
2. В панели REG.RU открой управление доменом и раздел DNS-записей/управления DNS-зоной. Названия пунктов интерфейса могут меняться. Если для домена указаны DNS-серверы стороннего провайдера, записи нужно менять у этого DNS-провайдера, а не в панели REG.RU.
3. Добавь DNS-запись типа **A**:

   | Поле | Значение для корневого домена |
   |---|---|
   | Имя/Host | `@` (или пустое поле, если панель обозначает так корень домена) |
   | Тип | `A` |
   | Значение/IP | публичный IPv4 твоего VPS |
   | TTL | оставить значение по умолчанию |

   Если хочешь использовать поддомен, например `app.mydomain.ru`, укажи `app` в поле имени записи, тип `A` и тот же IPv4. Тогда в приложении используй именно `app.mydomain.ru`.
4. Не добавляй запись `AAAA`, если у VPS нет настроенного публичного IPv6. Неверный `AAAA` может направить браузеры и проверку сертификата не на тот сервер.
5. Для текущей конфигурации выбери один основной hostname. `Caddyfile` сейчас обслуживает имя из `SITE_DOMAIN`; не добавляй `www` как альтернативный адрес, пока отдельно не настроишь его в Caddy.
6. Проверь DNS в Windows PowerShell, заменив пример на свой домен:

   ```powershell
   nslookup mydomain.ru
   ```

   Для поддомена проверь его полное имя, например `nslookup app.mydomain.ru`. Ответ должен содержать IP VPS. Обновление DNS может занять время — дождись, пока правильный адрес виден при проверке.

После успешной проверки DNS этот купленный домен используется точно так же, как DuckDNS: укажи его без схемы в `SITE_DOMAIN` и с `https://` в `PUBLIC_SITE_URL`. Caddy запросит HTTPS-сертификат автоматически, если DNS уже указывает на VPS и входящие TCP-порты 80/443 открыты.

### Если домен меняется после уже состоявшегося деплоя

Например, если сайт сначала работал на DuckDNS, а затем ты купил домен:

1. Создай A-запись нового домена и дождись, пока она указывает на IPv4 VPS.
2. Обнови GitHub Variable `PUBLIC_SITE_URL` на `https://НОВЫЙ_ДОМЕН` (например, `https://mydomain.ru`).
3. Измени на VPS `SITE_DOMAIN` и `PUBLIC_SITE_URL` в `/opt/sumrak/.env`.
4. Запусти **Actions → CI and deploy → Run workflow → main**. Сборка использует новое `PUBLIC_SITE_URL`, а деплой обновит Compose и Caddy.
5. В BotFather замени URL Mini App на `https://НОВЫЙ_ДОМЕН/miniapp`.
6. Проверь сайт, HTTPS-сертификат и открытие Mini App. Оставь старый домен настроенным до проверки нового.

Не добавляй `www` в DNS как альтернативное имя, пока Caddy не будет отдельно настроен обслуживать это имя и выдавать для него сертификат.

## 5. Создать отдельный SSH-ключ для GitHub Actions

На Windows открой PowerShell. Создай отдельную пару ключей специально для деплоя:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.ssh" | Out-Null
ssh-keygen -t ed25519 -C "sumrak-github-actions" -f "$env:USERPROFILE\.ssh\sumrak_deploy_v2"
```

На запрос passphrase нажми **Enter**, затем ещё раз **Enter**. Этот workflow не запрашивает парольную фразу; поэтому ключ должен быть незашифрованным и использоваться только как GitHub Secret для деплоя.

Созданы два файла:

- `sumrak_deploy_v2` — приватный ключ; никому не показывай и не отправляй;
- `sumrak_deploy_v2.pub` — публичный ключ; его нужно установить на VPS.

Скопируй публичный ключ в буфер обмена:

```powershell
Get-Content "$env:USERPROFILE\.ssh\sumrak_deploy_v2.pub" | Set-Clipboard
```

В Termius подключись своей административной учётной записью и создай SSH-каталог пользователя `deploy`:

```bash
sudo install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
sudo nano /home/deploy/.ssh/authorized_keys
```

В `nano` вставь публичный ключ из буфера одной строкой. Не удаляй другие строки, если они уже есть. Сохрани файл: **Ctrl+O**, Enter; выйди: **Ctrl+X**. Затем задай права:

```bash
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Проверь вход с Windows, подставив реальный IP VPS:

```powershell
ssh -i "$env:USERPROFILE\.ssh\sumrak_deploy_v2" deploy@ТВОЙ_IP_VPS
```

При первом подключении SSH спросит, доверяешь ли ты серверу. Сначала сравни отпечаток host key по процедуре следующего раздела; затем подтверди доверие. Убедись, что подключение работает без запроса пароля. Выйди командой `exit`.

Если SSH-ключ не принимается, проверь, что:

- в команде указан `deploy`, а не другой пользователь;
- именно строка из файла `.pub` находится в `/home/deploy/.ssh/authorized_keys`;
- на сервере права каталога `.ssh` равны `700`, файла `authorized_keys` — `600`;
- порт SSH открыт в firewall хостинга.

## 6. Получить и проверить `DEPLOY_KNOWN_HOSTS`

`DEPLOY_KNOWN_HOSTS` — публичный host key VPS. Это **не** приватный ключ деплоя и не пароль. Его нужно сверить, чтобы GitHub Runner подключался к ожидаемому серверу.

В Termius на VPS получи отпечаток SSH host key из консоли сервера:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

На Windows в PowerShell запусти `ssh-keyscan`, подставив тот же IP, который будешь записывать в `DEPLOY_HOST`:

```powershell
$VPS_HOST = "ТВОЙ_IP_VPS"
ssh-keyscan -t ed25519 -H $VPS_HOST 2>$null | Set-Content -Encoding ascii "$env:USERPROFILE\.ssh\sumrak_known_hosts"
ssh-keygen -lf "$env:USERPROFILE\.ssh\sumrak_known_hosts"
```

Сравни отпечаток из PowerShell с отпечатком, показанным Termius. Они должны совпадать. Если не совпадают, не используй результат `ssh-keyscan`, пока не выяснишь причину.

Скопируй проверенную запись для секрета GitHub:

```powershell
Get-Content -Raw "$env:USERPROFILE\.ssh\sumrak_known_hosts" | Set-Clipboard
```

В буфере находится запись `known_hosts`; её значение пойдёт в GitHub Secret `DEPLOY_KNOWN_HOSTS`. Запись содержит публичную информацию, но не публикуй её без необходимости.

## 7. Создать токен для скачивания образов из GHCR

GitHub Actions публикует Docker-образы в GitHub Container Registry, а VPS скачивает их. Для скачивания нужен токен пользователя GitHub, который имеет доступ к этим пакетам.

В GitHub открой:

**Аватар → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)**.

Задай срок действия и отметь:

- `read:packages` — чтение Docker-образов.
- Если пакеты приватные и GitHub требует дополнительный доступ к репозиторию, добавь `repo`.

Создай токен и сразу скопируй его в менеджер паролей: GitHub не покажет значение повторно. Не используй этот токен в `.env` на VPS; он нужен только в GitHub Secret.

## 8. Заполнить GitHub Actions Variables и Secrets

Открой репозиторий `edit29/Sumrak` на GitHub:

**Settings → Secrets and variables → Actions**.

### Repository Variables

Открой вкладку **Variables** и добавь:

| Имя | Значение | Обязательно |
|---|---|---|
| `PUBLIC_SITE_URL` | `https://<ВАШ_ДОМЕН>` — например `https://sumrakapp.duckdns.org` или `https://mydomain.ru` | Да |
| `DEPLOY_PATH` | `/opt/sumrak` | Нет, это значение по умолчанию |
| `GHCR_USERNAME` | `edit29` | Нет, по умолчанию используется владелец репозитория |

`PUBLIC_SITE_URL` — публичный адрес, не пароль. Подставь тот же hostname, который выбрал в разделе 4; значение должно совпадать с адресом в `.env` на VPS.

### Repository Secrets

Во вкладке **Secrets** нажми **New repository secret** для каждого секрета:

| Имя секрета | Что указать |
|---|---|
| `DEPLOY_HOST` | Публичный IPv4 VPS. Он должен совпасть с адресом, для которого создан `DEPLOY_KNOWN_HOSTS`. |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY_B64` | Base64-кодированное содержимое приватного файла `sumrak_deploy_v2`, см. команду ниже. |
| `DEPLOY_KNOWN_HOSTS` | Проверенная запись из `sumrak_known_hosts`, скопированная выше. |
| `GHCR_READ_TOKEN` | Personal Access Token с `read:packages`. |

Скопируй приватный SSH-ключ в Base64 прямо в буфер обмена PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\.ssh\sumrak_deploy_v2")) | Set-Clipboard
```

В GitHub Secret `DEPLOY_SSH_KEY_B64` вставь содержимое буфера. В GitHub сохраняется однострочное Base64-представление приватного ключа. Не вставляй его в Termius, чат, `.env` или репозиторий. Workflow декодирует значение на временном GitHub Runner и удаляет временный файл при завершении шага.

Все значения добавляй через **New repository secret**, а не **Manage Environment Secrets**: текущий workflow использует repository-level secrets и не объявляет GitHub Environment.

Перед запуском проверь в **Settings → Actions → General**, что GitHub Actions разрешены для репозитория.

## 9. Создать Telegram-бота

В Telegram открой `@BotFather`:

1. Выполни `/newbot` и пройди шаги создания бота.
2. Сохрани выданный Bot Token в менеджере паролей. Не вставляй его в GitHub Variables или код.
3. Через `/mybots` выбери нового бота и найди настройку **Main Mini App** или **Menu Button**.
4. Укажи HTTPS URL Mini App: `https://<ВАШ_ДОМЕН>/miniapp`, заменив `<ВАШ_ДОМЕН>` на выбранное имя, например `sumrakapp.duckdns.org` или `mydomain.ru`.

Бот будет доступен только после того, как на VPS окажется действующий `TELEGRAM_BOT_TOKEN` и приложение будет перезапущено с этим значением.

## 10. Создать серверный `/opt/sumrak/.env`

Сначала сгенерируй два **разных** длинных пароля на VPS в Termius:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Первый результат используй как `POSTGRES_PASSWORD`, второй — как `OWNER_PASSWORD`. Сохрани оба в менеджере паролей. Не используй примерные строки из документации.

Убедись, что каталог принадлежит пользователю деплоя:

```bash
sudo chown deploy:deploy /opt/sumrak
```

В Termius подключись как `deploy` и открой новый файл:

```bash
nano /opt/sumrak/.env
```

Вставь конфигурацию, заменив значения справа на реальные. Удали квадратные скобки и не добавляй пробелы вокруг `=`:

```dotenv
GHCR_OWNER=edit29
IMAGE_TAG=latest
SITE_DOMAIN=ВАШ_ДОМЕН
PUBLIC_SITE_URL=https://ВАШ_ДОМЕН
POSTGRES_DB=sumrak
POSTGRES_USER=sumrak
POSTGRES_PASSWORD=ВСТАВЬ_ПЕРВЫЙ_СГЕНЕРИРОВАННЫЙ_HEX_ПАРОЛЬ
OWNER_PASSWORD=ВСТАВЬ_ВТОРОЙ_СГЕНЕРИРОВАННЫЙ_HEX_ПАРОЛЬ
TELEGRAM_BOT_TOKEN=ВСТАВЬ_ТОКЕН_ОТ_BOTFATHER
```

Для `POSTGRES_PASSWORD` используй hex-строку из `openssl rand -hex 32`: такой пароль безопасно включается в URL подключения к PostgreSQL. Не заключай значения в кавычки и не добавляй `<` или `>`.

Сохрани файл: **Ctrl+O**, Enter; выйди: **Ctrl+X**. Затем на VPS выполни:

```bash
chmod 600 /opt/sumrak/.env
ls -l /opt/sumrak/.env
```

Ожидаемые права файла — `-rw-------`. Не запускай `cat /opt/sumrak/.env`: это выведет секреты в терминал. В репозитории есть `.env.example`, но он только шаблон; настоящий серверный `.env` workflow не копирует и не должен попадать в Git.

Эти переменные не требуется добавлять вручную: `API_URL`, `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `ALLOWED_ORIGIN` — Compose передаёт нужные значения приложениям сам.

## 11. Запустить GitHub Actions и проверить деплой

Убедись, что в `main` находится актуальный код, включая:

- `compose.yaml`;
- `Caddyfile`;
- `.github/workflows/deploy.yml`;
- каталоги `sumrak-api`, `sumrak-web`, `sumrak-miniapp`.

Workflow запускается автоматически при push в `main`. Его можно запустить вручную:

1. Открой вкладку **Actions** репозитория.
2. Слева выбери **CI and deploy**.
3. Нажми **Run workflow**.
4. Выбери ветку `main` и подтверди запуск.

Сначала выполняются тесты и production-сборки. Затем образы публикуются в GHCR и передаются на VPS. Все три этапа — `checks`, `publish`, `deploy` — должны завершиться зелёным статусом.

В Termius подключись к VPS как `deploy` и проверь контейнеры:

```bash
cd /opt/sumrak
docker compose ps
```

Посмотри последние сообщения Caddy:

```bash
docker compose logs --tail=100 caddy
```

Открой адреса, подставив выбранный домен:

- основной сайт: `https://<ВАШ_ДОМЕН>`;
- Mini App: `https://<ВАШ_ДОМЕН>/miniapp`.

Если Mini App открыт не внутри Telegram, он должен показать просьбу открыть приложение в Telegram. Это ожидаемо: авторизация Mini App использует проверенную Telegram-сессию.

После запуска открой бота в Telegram и проверь, что кнопка **Main Mini App** или **Menu Button** ведёт на `/miniapp`. Сделай тестовую заявку и проверь, что она появилась в кабинете владельца.

## 12. Обычные обновления приложения

Чтобы опубликовать изменение:

1. Измени код локально и проверь его.
2. Создай commit и отправь его в ветку `main`.
3. Открой **Actions → CI and deploy** и дождись `checks`, `publish`, `deploy`.
4. Проверь сайт и Mini App по HTTPS.

При pull request выполняются проверки и сборки, но публикация образов и деплой не выполняются. Не делай `docker compose down -v`: флаг `-v` удалит том PostgreSQL вместе с данными.

Если изменился только серверный `.env`, GitHub сам не узнает об изменении. После обновления файла на VPS пересоздай нужный сервис:

```bash
cd /opt/sumrak
docker compose up -d --force-recreate api
```

Для изменения других сервисов замени `api` на нужное имя сервиса (`web`, `miniapp` или `caddy`). Не показывай `.env` при запросе помощи; присылай только сообщения об ошибке без секретов.

## 13. Диагностика типичных ошибок

### Белая страница и CSP блокирует inline-скрипты

Next.js меняет содержимое встроенных скриптов между сборками, поэтому постоянные CSP-хеши в `Caddyfile` могут устареть и заблокировать загрузку страницы. В текущей конфигурации CSP с одноразовым nonce формируют middleware основного сайта и Mini App; не возвращай в Caddyfile фиксированный `script-src` с хешами или второй CSP-заголовок. После изменения middleware или Caddyfile отправь коммит в `main` и дождись успешного деплоя через GitHub Actions.

### GitHub пишет `This workflow does not exist`

- Проверь, что в `main` есть `.github/workflows/deploy.yml`.
- В **Settings → Actions → General** разреши GitHub Actions.
- Открой **Actions → CI and deploy**. Для этого workflow настроен ручной `workflow_dispatch`.

### Ошибка `Set the PUBLIC_SITE_URL repository variable`

В **Settings → Secrets and variables → Actions → Variables** добавь `PUBLIC_SITE_URL` со значением `https://<ВАШ_ДОМЕН>`. В `.env` на VPS `SITE_DOMAIN` должен содержать то же имя без `https://`, а `PUBLIC_SITE_URL` — с ним.

### `Load key ... error in libcrypto`

Workflow должен использовать Secret `DEPLOY_SSH_KEY_B64`, а не многострочный `DEPLOY_SSH_KEY`. Пересоздай Base64 командой из раздела 8, вставив значение в `DEPLOY_SSH_KEY_B64`. Убедись, что выбран именно приватный файл без `.pub`.

### `Permission denied (publickey,password)`

SSH-сервер не принял ключ. Проверь, что `DEPLOY_USER` равен `deploy`, публичный ключ находится в `/home/deploy/.ssh/authorized_keys`, Windows-команда `ssh -i ... deploy@IP` проходит без запроса пароля, и для GitHub открыт TCP-порт 22.

### Ошибка доступа к Docker или `/opt/sumrak`

Заново подключись по SSH, чтобы применилось членство `deploy` в группе `docker`. Проверь `docker ps`, владельца `/opt/sumrak` и права `.env`. Не публикуй вывод `docker inspect` или полный конфиг контейнера: там могут присутствовать переменные окружения.

### `denied` или `unauthorized` при загрузке образов

Проверь Secret `GHCR_READ_TOKEN`, его срок действия, право `read:packages` и доступ пользователя токена к пакетам проекта. Убедись, что `GHCR_USERNAME` — имя владельца токена, если оно задано вручную.

### Caddy не выдаёт HTTPS-сертификат

Проверь, что DNS-запись выбранного домена (DuckDNS или купленного домена) указывает на VPS, доступны TCP 80/443 в панели хостинга и нет ошибок в сообщениях:

```bash
cd /opt/sumrak
docker compose logs --tail=100 caddy
```

Не публикуй логи, если в них есть токены, пароли или персональные данные.

### Секреты случайно попали в чат или Git

Немедленно замени соответствующий пароль/токен у сервиса-владельца, обнови его в серверном `.env` или GitHub Secret и перезапусти затронутый сервис. Удаление сообщения или коммита само по себе не делает раскрытый секрет безопасным.

