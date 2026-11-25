-- Выполнить один раз на существующей PostgreSQL-базе, если таблица ещё не создана.
CREATE TABLE IF NOT EXISTS date_requests (
 id bigserial PRIMARY KEY,
 route jsonb NOT NULL,
 confirmed_at timestamptz NOT NULL DEFAULT now()
);
