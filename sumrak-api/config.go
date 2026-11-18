package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// Общее состояние и настройки из переменных окружения.
var (
	db               *pgxpool.Pool
	origin           string // адрес сайта, с которого разрешены запросы на изменение данных
	miniAppOrigin    string
	ownerPass        string // пароль кабинета владельца
	telegramBotToken string

	// Кто может войти в кабинет из Telegram без пароля (см. handlers_owner_telegram.go)
	ownerTelegramUsernames map[string]bool
	ownerTelegramIDs       map[int64]bool
)

func loadConfig() error {
	for _, path := range []string{".env", "../.env"} {
		if _, err := os.Stat(path); err != nil {
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			return fmt.Errorf("checking %s: %w", path, err)
		}
		if err := godotenv.Load(path); err != nil {
			return fmt.Errorf("loading %s: %w", path, err)
		}
		break
	}

	origin = os.Getenv("ALLOWED_ORIGIN")
	miniAppOrigin = os.Getenv("TELEGRAM_MINI_APP_ORIGIN")
	if miniAppOrigin == "" {
		miniAppOrigin = "http://localhost:3001"
	}
	ownerPass = os.Getenv("OWNER_PASSWORD")
	telegramBotToken = os.Getenv("TELEGRAM_BOT_TOKEN")
	ownerTelegramUsernames = parseTelegramUsernames(os.Getenv("OWNER_TELEGRAM_USERNAMES"))
	ownerTelegramIDs = parseTelegramIDs(os.Getenv("OWNER_TELEGRAM_IDS"))
	return nil
}
