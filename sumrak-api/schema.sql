-- Прайс компании: меняется в таблице settings, старые заявки хранят свой снимок
CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value jsonb NOT NULL);
INSERT INTO settings(key,value) VALUES ('pricing','{
 "windows":{"front":4000,"rear":4000,"fs":2000,"rs":2000},
 "types":{"kei":0.8,"coupe":1,"sedan":1,"wagon":1.15,"suv":1.2,"pickup":1.1,"van":1.3,"other":null},
 "colors":["green","blue","yellow","violet"],
 "lights":{"headlights":2000,"taillights":2000},
 "booking":{"front":2000,"rear":2000,"fs":1000,"rs":1000,"headlights":1000,"taillights":1000},
 "removal":{"front":2000,"rear":2000,"fs":1000,"rs":1000,"headlights":1000,"taillights":1000}}') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS orders (
 id bigserial PRIMARY KEY,
 token text UNIQUE NOT NULL,            -- непредсказуемый токен приватной ссылки
 idem_key text UNIQUE NOT NULL,         -- повтор с тем же ключом не создаёт дубль
 name text NOT NULL, phone text NOT NULL, car_name text NOT NULL DEFAULT '',
 wish_date date, wish_time text, comment text NOT NULL DEFAULT '',
 items jsonb NOT NULL,                  -- состав с ценами на момент отправки
 pricing jsonb NOT NULL,                -- снимок прайса на момент отправки
 known_total int NOT NULL, manual_count int NOT NULL,
 status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','agreed','done','cancelled')),
 final_price int, scheduled_at timestamptz,
 owner_note text NOT NULL DEFAULT '',   -- приватная заметка, наружу не отдаётся
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (status <> 'agreed' OR (final_price IS NOT NULL AND scheduled_at IS NOT NULL)),
 CHECK (wish_time IS NULL OR wish_date IS NOT NULL));

-- Фото (закрытые, отдаются только владельцу) и сеансы владельца
CREATE TABLE IF NOT EXISTS photos (id text PRIMARY KEY, order_id bigint REFERENCES orders(id) ON DELETE CASCADE,
 mime text NOT NULL, data bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, expires timestamptz NOT NULL);

-- Вход владельца из Telegram: закрепление username за числовым Telegram ID. Повторный запуск безопасен.
CREATE TABLE IF NOT EXISTS owner_telegram_bindings (
 username text PRIMARY KEY,
 tg_user_id bigint NOT NULL,
 bound_at timestamptz NOT NULL DEFAULT now());


-- Личный маршрут свидания (последнее подтверждение показывается владельцу)
CREATE TABLE IF NOT EXISTS date_requests (
 id bigserial PRIMARY KEY,
 route jsonb NOT NULL,
 confirmed_at timestamptz NOT NULL DEFAULT now()
);
