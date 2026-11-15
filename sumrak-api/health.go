package main

import (
	"context"
	"net/http"
	"time"
)

func health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if db == nil || db.Ping(ctx) != nil {
		fail(w, http.StatusServiceUnavailable, "сервис недоступен")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
