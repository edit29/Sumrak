package main

import (
	"io"
	"net/http"
)

var okMime = map[string]bool{"image/jpeg": true, "image/png": true, "image/webp": true}

// Реальный формат определяется по содержимому, а не по расширению. Размер ≤ 3 МБ (клиент сжимает заранее).
func upload(w http.ResponseWriter, r *http.Request) {
	f, _, err := r.FormFile("file")
	if err != nil {
		fail(w, 400, "Файл не получен или больше 4 МБ")
		return
	}
	defer f.Close()
	b, _ := io.ReadAll(io.LimitReader(f, 3<<20+1))
	if len(b) > 3<<20 {
		fail(w, 413, "Фото больше 3 МБ")
		return
	}
	m := http.DetectContentType(b)
	if !okMime[m] {
		fail(w, 415, "Нужен JPEG, PNG или WebP")
		return
	}
	id := rnd()
	if _, err := db.Exec(r.Context(), `INSERT INTO photos(id,mime,data) VALUES($1,$2,$3)`, id, m, b); err != nil {
		fail(w, 500, "Не удалось сохранить фото")
		return
	}
	ok(w, map[string]string{"id": id})
}

func ownerPhoto(w http.ResponseWriter, r *http.Request) {
	var m string
	var b []byte
	if db.QueryRow(r.Context(), `SELECT mime,data FROM photos WHERE id=$1`, r.PathValue("id")).Scan(&m, &b) != nil {
		fail(w, 404, "Нет фото")
		return
	}
	w.Header().Set("Content-Type", m)
	w.Header().Set("Cache-Control", "private, no-store")
	w.Write(b)
}
