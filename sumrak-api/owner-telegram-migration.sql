-- Вход владельца из Telegram: закрепление username за числовым Telegram ID. Повторный запуск безопасен.
CREATE TABLE IF NOT EXISTS owner_telegram_bindings (
 username text PRIMARY KEY,
 tg_user_id bigint NOT NULL,
 bound_at timestamptz NOT NULL DEFAULT now());
