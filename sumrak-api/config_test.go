package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfigReadsParentDotEnv(t *testing.T) {
	workingDir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	apiDir := filepath.Join(root, "sumrak-api")
	if err := os.Mkdir(apiDir, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, ".env"), []byte(
		"DATABASE_URL=postgres://user:pass@localhost:5432/sumrak\n"+
			"ALLOWED_ORIGIN=http://localhost:3000\n"+
			"OWNER_PASSWORD=test-password\n"+
			"TELEGRAM_BOT_TOKEN=test-bot-token\n"+
			"TELEGRAM_MINI_APP_ORIGIN=https://mini.example.com\n",
	), 0600); err != nil {
		t.Fatal(err)
	}

	keys := []string{"DATABASE_URL", "ALLOWED_ORIGIN", "OWNER_PASSWORD", "TELEGRAM_BOT_TOKEN", "TELEGRAM_MINI_APP_ORIGIN"}
	type envValue struct {
		value string
		set   bool
	}
	previousEnv := make(map[string]envValue, len(keys))
	for _, key := range keys {
		value, set := os.LookupEnv(key)
		previousEnv[key] = envValue{value: value, set: set}
		if err := os.Unsetenv(key); err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		for key, previous := range previousEnv {
			if previous.set {
				_ = os.Setenv(key, previous.value)
			} else {
				_ = os.Unsetenv(key)
			}
		}
	})

	previousOrigin, previousMiniAppOrigin, previousOwnerPass, previousBotToken := origin, miniAppOrigin, ownerPass, telegramBotToken
	t.Cleanup(func() {
		origin, miniAppOrigin, ownerPass, telegramBotToken = previousOrigin, previousMiniAppOrigin, previousOwnerPass, previousBotToken
	})
	if err := os.Chdir(apiDir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(workingDir)
	})

	if err := loadConfig(); err != nil {
		t.Fatalf("loadConfig returned an error: %v", err)
	}
	if got := os.Getenv("DATABASE_URL"); got != "postgres://user:pass@localhost:5432/sumrak" {
		t.Fatalf("unexpected DATABASE_URL: %q", got)
	}
	if origin != "http://localhost:3000" {
		t.Fatalf("unexpected ALLOWED_ORIGIN: %q", origin)
	}
	if ownerPass != "test-password" {
		t.Fatalf("unexpected OWNER_PASSWORD: %q", ownerPass)
	}
	if telegramBotToken != "test-bot-token" {
		t.Fatalf("unexpected TELEGRAM_BOT_TOKEN: %q", telegramBotToken)
	}
	if miniAppOrigin != "https://mini.example.com" {
		t.Fatalf("unexpected TELEGRAM_MINI_APP_ORIGIN: %q", miniAppOrigin)
	}
}
