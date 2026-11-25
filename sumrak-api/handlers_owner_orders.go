package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func ownerList(w http.ResponseWriter, r *http.Request) {
	st, q := r.URL.Query().Get("status"), strings.TrimSpace(r.URL.Query().Get("q"))
	rows, err := db.Query(r.Context(), `SELECT o.id,o.name,o.phone,o.car_name,o.wish_date::text,o.wish_time,o.comment,o.items,o.known_total,o.manual_count,
		o.status,o.final_price,o.scheduled_at,o.owner_note,o.created_at,
		COALESCE((SELECT array_agg(id ORDER BY created_at) FROM photos WHERE order_id=o.id),'{}')
		FROM orders o WHERE ($1='' OR o.status=$1) AND ($2='' OR o.name ILIKE $3 OR o.phone ILIKE $3) ORDER BY o.created_at DESC LIMIT 200`, st, q, "%"+q+"%")
	if err != nil {
		fail(w, 500, "Ошибка базы")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id int64
		var name, phone, carName, comment, status, note string
		var wd, wt *string
		var items json.RawMessage
		var known, manual int
		var final *int
		var at *time.Time
		var created time.Time
		var photos []string
		if rows.Scan(&id, &name, &phone, &carName, &wd, &wt, &comment, &items, &known, &manual, &status, &final, &at, &note, &created, &photos) != nil {
			continue
		}
		out = append(out, map[string]any{"id": id, "name": name, "phone": phone, "carName": carName, "wishDate": wd, "wishTime": wt, "comment": comment, "items": items,
			"knownTotal": known, "manualCount": manual, "status": status, "finalPrice": final, "scheduledAt": at, "ownerNote": note, "createdAt": created, "photos": photos})
	}
	ok(w, out)
}

func ownerPatch(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status      string     `json:"status"`
		FinalPrice  *int       `json:"finalPrice"`
		ScheduledAt *time.Time `json:"scheduledAt"`
		OwnerNote   string     `json:"ownerNote"`
	}
	id, e1 := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if e1 != nil || json.NewDecoder(r.Body).Decode(&in) != nil {
		fail(w, 400, "Неверный запрос")
		return
	}
	errs := map[string]string{}
	switch in.Status {
	case "new", "agreed", "done", "cancelled":
	default:
		errs["status"] = "Неверный статус"
	}
	if in.Status == "agreed" {
		if in.FinalPrice == nil || *in.FinalPrice <= 0 {
			errs["finalPrice"] = "Для «согласована» укажите цену"
		}
		if in.ScheduledAt == nil {
			errs["scheduledAt"] = "Для «согласована» укажите время"
		}
	}
	if len(errs) > 0 {
		fieldFail(w, errs)
		return
	}
	ct, err := db.Exec(r.Context(), `UPDATE orders SET status=$1,final_price=$2,scheduled_at=$3,owner_note=$4 WHERE id=$5`, in.Status, in.FinalPrice, in.ScheduledAt, in.OwnerNote, id)
	if err != nil || ct.RowsAffected() != 1 {
		fail(w, 404, "Заявка не найдена")
		return
	}
	ok(w, map[string]bool{"ok": true})
}

func ownerDelete(w http.ResponseWriter, r *http.Request) { // фото удаляются каскадом
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	db.Exec(r.Context(), `DELETE FROM orders WHERE id=$1`, id)
	ok(w, map[string]bool{"ok": true})
}
