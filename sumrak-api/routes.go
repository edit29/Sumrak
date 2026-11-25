package main

import (
	"net/http"
)

// routes — единая таблица REST-маршрутов: все пути и методы описаны здесь.
func routes() *http.ServeMux {
	mux := http.NewServeMux()

	// Служебное
	mux.HandleFunc("GET /healthz", health)

	// Публичное API
	mux.HandleFunc("POST /api/date-request", guard(createDateRequest))
	mux.HandleFunc("GET /api/pricing", guard(publicPricing))
	mux.HandleFunc("POST /api/quote", guard(quote))
	mux.HandleFunc("POST /api/orders", guard(create))
	mux.HandleFunc("GET /api/orders/{token}", guard(view))
	mux.HandleFunc("POST /api/photos", guard(upload))

	// Защищённые Telegram Mini App endpoints
	mux.HandleFunc("GET /api/telegram/pricing", guard(telegramAuth(publicPricing)))
	mux.HandleFunc("POST /api/telegram/quote", guard(telegramAuth(quote)))
	mux.HandleFunc("POST /api/telegram/orders", guard(telegramAuth(create)))
	mux.HandleFunc("POST /api/telegram/photos", guard(telegramAuth(upload)))

	// Кабинет владельца внутри Mini App: подпись Telegram + (после входа) сеанс владельца
	mux.HandleFunc("POST /api/telegram/owner/login", guard(telegramAuth(ownerTelegramLogin)))
	mux.HandleFunc("POST /api/telegram/owner/logout", guard(telegramAuth(logout)))
	mux.HandleFunc("GET /api/telegram/owner/orders", guard(telegramAuth(auth(ownerList))))
	mux.HandleFunc("PATCH /api/telegram/owner/orders/{id}", guard(telegramAuth(auth(ownerPatch))))
	mux.HandleFunc("DELETE /api/telegram/owner/orders/{id}", guard(telegramAuth(auth(ownerDelete))))

	// Кабинет владельца (после входа)
	mux.HandleFunc("GET /api/owner/date-request", guard(auth(ownerDateRequest)))
	mux.HandleFunc("POST /api/owner/login", guard(login))
	mux.HandleFunc("POST /api/owner/logout", guard(logout))
	mux.HandleFunc("GET /api/owner/orders", guard(auth(ownerList)))
	mux.HandleFunc("PATCH /api/owner/orders/{id}", guard(auth(ownerPatch)))
	mux.HandleFunc("DELETE /api/owner/orders/{id}", guard(auth(ownerDelete)))
	mux.HandleFunc("GET /api/owner/photos/{id}", guard(auth(ownerPhoto)))
	return mux
}
