package main

import (
	"net/http"
	"sync"
	"time"
)

// Счётчик запросов для ограничения частоты (по адресу клиента).
var (
	hits = map[string][]time.Time{}
	mu   sync.Mutex
)

// Origin + лимит 30 запросов в минуту с адреса + лимит тела 64 КБ
func guard(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" && (origin == "" || r.Header.Get("Origin") != origin) {
			fail(w, 403, "запрещённый origin")
			return
		}
		ip := r.Header.Get("X-Forwarded-For")
		if ip == "" {
			ip = r.RemoteAddr
		}
		mu.Lock()
		now, recent := time.Now(), []time.Time{}
		for _, t := range hits[ip] {
			if now.Sub(t) < time.Minute {
				recent = append(recent, t)
			}
		}
		hits[ip] = append(recent, now)
		over := len(hits[ip]) > 30
		mu.Unlock()
		if over {
			fail(w, 429, "слишком много запросов")
			return
		}
		lim := int64(64 << 10)
		if r.URL.Path == "/api/photos" {
			lim = 4 << 20
		}
		r.Body = http.MaxBytesReader(w, r.Body, lim)
		h(w, r)
	}
}

func auth(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie("sid")
		var x int
		if err != nil || db.QueryRow(r.Context(), `SELECT 1 FROM sessions WHERE token_hash=$1 AND expires>now()`, hash(c.Value)).Scan(&x) != nil {
			fail(w, 401, "Требуется вход")
			return
		}
		h(w, r)
	}
}
