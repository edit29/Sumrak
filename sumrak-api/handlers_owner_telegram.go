package main

import (
	"context"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Данные initData действительны сутки, но для входа в кабинет берём только свежие: если они где-то утекут,
// воспользоваться ими можно недолго.
const ownerTelegramLoginMaxAge = time.Hour

var telegramUsernameRe = regexp.MustCompile(`^[a-z0-9_]{5,32}$`)

// "@Ivan_Master" -> "ivan_master"; пустая строка, если это не username Telegram.
func normalizeTelegramUsername(s string) string {
	s = strings.ToLower(strings.TrimPrefix(strings.TrimSpace(s), "@"))
	if !telegramUsernameRe.MatchString(s) {
		return ""
	}
	return s
}

func parseTelegramUsernames(list string) map[string]bool {
	out := map[string]bool{}
	for _, part := range strings.Split(list, ",") {
		if name := normalizeTelegramUsername(part); name != "" {
			out[name] = true
		}
	}
	return out
}

func parseTelegramIDs(list string) map[int64]bool {
	out := map[int64]bool{}
	for _, part := range strings.Split(list, ",") {
		if id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64); err == nil && id > 0 {
			out[id] = true
		}
	}
	return out
}

// ownerTelegramAllowed решает, пускать ли пользователя Telegram в кабинет без пароля.
//
// Username в Telegram можно сменить, и освободившийся username может занять другой человек. Поэтому при первом входе
// username закрепляется за числовым ID (его сменить нельзя), и дальше пускается только этот ID.
// Надёжнее всего перечислить числовые ID в OWNER_TELEGRAM_IDS (узнать свой ID можно у бота @userinfobot).
func ownerTelegramAllowed(ctx context.Context, u telegramUser) bool {
	if ownerTelegramIDs[u.ID] {
		return true
	}
	name := normalizeTelegramUsername(u.Username)
	if name == "" || !ownerTelegramUsernames[name] {
		return false
	}
	var pinned int64
	err := db.QueryRow(ctx, `INSERT INTO owner_telegram_bindings(username, tg_user_id) VALUES($1, $2)
		ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username RETURNING tg_user_id`, name, u.ID).Scan(&pinned)
	if err != nil {
		log.Printf("owner telegram binding: %v", err)
		return false
	}
	if pinned != u.ID {
		log.Printf("owner telegram login denied: @%s is pinned to another Telegram ID (got %d)", name, u.ID)
		return false
	}
	return true
}

// POST /api/telegram/owner/login — вход в кабинет из Mini App без пароля.
// Подпись данных Telegram уже проверена в telegramAuth.
func ownerTelegramLogin(w http.ResponseWriter, r *http.Request) {
	u, parsed := telegramUserFromInitData(r.Header.Get("X-Telegram-Init-Data"))
	if !parsed {
		fail(w, 401, "Не удалось проверить данные Telegram")
		return
	}
	if time.Since(u.AuthDate) > ownerTelegramLoginMaxAge {
		fail(w, 401, "Данные Telegram устарели. Закройте и снова откройте приложение.")
		return
	}
	if !ownerTelegramAllowed(r.Context(), u) {
		time.Sleep(500 * time.Millisecond)
		fail(w, 403, "Этот аккаунт Telegram не имеет доступа к кабинету")
		return
	}
	log.Printf("owner login via telegram: id=%d username=%q", u.ID, u.Username)
	startOwnerSession(w, r)
}
