package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

var phoneRe = regexp.MustCompile(`^\+?[0-9 ()\-]{7,20}$`)

func create(w http.ResponseWriter, r *http.Request) {
	key := r.Header.Get("Idempotency-Key")
	var o Order
	if len(key) < 16 || len(key) > 80 || json.NewDecoder(r.Body).Decode(&o) != nil {
		fail(w, 400, "нужны Idempotency-Key и корректный JSON")
		return
	}
	errs := map[string]string{}
	if strings.TrimSpace(o.Name) == "" {
		errs["name"] = "Укажите имя"
	}
	if len([]rune(strings.TrimSpace(o.CarName))) > 100 {
		errs["carName"] = "Не длиннее 100 символов"
	}
	if !phoneRe.MatchString(o.Phone) {
		errs["phone"] = "Введите телефон, например +7 900 000-00-00"
	}
	if !o.Consent {
		errs["consent"] = "Нужно согласие на обработку данных"
	}
	if o.WishTime != "" && o.WishDate == "" {
		errs["wishTime"] = "Для времени укажите дату"
	}
	if len(o.Comment) > 1000 {
		errs["comment"] = "Не длиннее 1000 символов"
	}
	if len(o.Items) == 0 || len(o.Items) > 20 {
		errs["items"] = "Добавьте от 1 до 20 позиций"
	}
	if len(o.PhotoIDs) > 3 {
		errs["photos"] = "Не больше трёх фото"
	}
	var wd any
	if o.WishDate != "" {
		if d, err := time.Parse("2006-01-02", o.WishDate); err != nil {
			errs["wishDate"] = "Неверная дата"
		} else {
			wd = d
		}
	}
	tx, err := db.Begin(r.Context())
	if err != nil {
		fail(w, 500, "база недоступна")
		return
	}
	defer tx.Rollback(r.Context())
	p, err := loadPricing(r.Context(), tx)
	if err != nil {
		fail(w, 500, "прайс недоступен")
		return
	}
	seenTargets, seenManual := map[string]bool{}, map[string]bool{}
	for i := range o.Items {
		if err := price(p, &o.Items[i]); err != nil {
			errs["items"] = err.Error()
			continue
		}
		if err := claimTargets(seenTargets, o.Items[i]); err != nil {
			errs["items"] = err.Error()
		}
		if err := claimManualPosition(seenManual, o.Items[i]); err != nil {
			errs["items"] = err.Error()
		}
		if o.Items[i].Type == "other" && len(o.PhotoIDs) == 0 {
			errs["photos"] = "Для «Другое» нужно хотя бы одно фото"
		}
	}
	if len(errs) > 0 {
		fieldFail(w, errs)
		return
	}
	s, m := totals(o.Items)
	tok := rnd()
	items, _ := json.Marshal(o.Items)
	snap, _ := json.Marshal(p)
	var out string
	var oid int64
	err = tx.QueryRow(r.Context(), `INSERT INTO orders(token,idem_key,car_name,name,phone,wish_date,wish_time,comment,items,pricing,known_total,manual_count)
		VALUES($1,$2,$3,$4,$5,$6,NULLIF($7,''),$8,$9,$10,$11,$12) ON CONFLICT (idem_key) DO NOTHING RETURNING token,id`,
		tok, key, strings.TrimSpace(o.CarName), strings.TrimSpace(o.Name), o.Phone, wd, o.WishTime, o.Comment, items, snap, s, m).Scan(&out, &oid)
	if errors.Is(err, pgx.ErrNoRows) { // повтор: отдаём прежнюю заявку, фото не трогаем
		err = tx.QueryRow(r.Context(), `SELECT token FROM orders WHERE idem_key=$1`, key).Scan(&out)
	} else if err == nil && len(o.PhotoIDs) > 0 {
		ct, e2 := tx.Exec(r.Context(), `UPDATE photos SET order_id=$1 WHERE id=ANY($2) AND order_id IS NULL`, oid, o.PhotoIDs)
		if e2 != nil || ct.RowsAffected() != int64(len(o.PhotoIDs)) {
			fieldFail(w, map[string]string{"photos": "Фото не найдены, загрузите заново"})
			return
		}
	}
	if err != nil || tx.Commit(r.Context()) != nil {
		fail(w, 500, "не удалось сохранить заявку")
		return
	}
	ok(w, map[string]any{"token": out, "known_total": s, "manual_count": m}) // успех — только после записи
}

// Публично: без owner_note, контактов и фото
func view(w http.ResponseWriter, r *http.Request) {
	var items json.RawMessage
	var status string
	var known, manual int
	var final *int
	var at *time.Time
	var created time.Time
	err := db.QueryRow(r.Context(), `SELECT items,status,known_total,manual_count,final_price,scheduled_at,created_at FROM orders WHERE token=$1`,
		r.PathValue("token")).Scan(&items, &status, &known, &manual, &final, &at, &created)
	if err != nil {
		fail(w, 404, "заявка не найдена")
		return
	}
	ok(w, map[string]any{"items": items, "status": status, "known_total": known, "manual_count": manual,
		"final_price": final, "scheduled_at": at, "created_at": created})
}
