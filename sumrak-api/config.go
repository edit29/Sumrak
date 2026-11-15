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
	db        *pgxpool.Pool
	origin    string // адрес сайта, с которого разрешены запросы на изменение данных
	ownerPass string // пароль кабинета владельца
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
	ownerPass = os.Getenv("OWNER_PASSWORD")
	return nil
}
