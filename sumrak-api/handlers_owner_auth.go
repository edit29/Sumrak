package main

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

func login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Password string `json:"password"`
	}
	json.NewDecoder(r.Body).Decode(&in)
	if ownerPass == "" || subtle.ConstantTimeCompare([]byte(in.Password), []byte(ownerPass)) != 1 {
		time.Sleep(500 * time.Millisecond)
		fail(w, 401, "Неверный пароль")
		return
	}
	startOwnerSession(w, r)
}

// startOwnerSession выдаёт cookie сеанса владельца. Общая для входа по паролю и входа из Telegram.
func startOwnerSession(w http.ResponseWriter, r *http.Request) {
	t := rnd()
	if _, err := db.Exec(r.Context(), `INSERT INTO sessions(token_hash,expires) VALUES($1, now()+interval '7 days')`, hash(t)); err != nil {
		fail(w, 500, "база недоступна")
		return
	}
	http.SetCookie(w, &http.Cookie{Name: "sid", Value: t, Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: strings.HasPrefix(origin, "https"), MaxAge: 7 * 86400})
	ok(w, map[string]bool{"ok": true})
}

func logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie("sid"); err == nil {
		db.Exec(r.Context(), `DELETE FROM sessions WHERE token_hash=$1`, hash(c.Value))
	}
	http.SetCookie(w, &http.Cookie{Name: "sid", Path: "/", MaxAge: -1})
	ok(w, map[string]bool{"ok": true})
}
