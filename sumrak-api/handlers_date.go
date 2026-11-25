package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
)

type dateActivity struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Icon  string `json:"icon"`
}

var dateActivities = map[string]dateActivity{
	// Current invitation options.
	"coffee":         {"coffee", "Кофейня", "☕"},
	"fast-food":      {"fast-food", "Фастфуд", "🍔"},
	"short-walk":     {"short-walk", "Короткая прогулка", "🚶"},
	"twilight":       {"twilight", "Фильм «Сумерки» в кино", "🎬"},
	"wheel":          {"wheel", "Колесо обозрения", "🎡"},
	"museum":         {"museum", "Музей", "🏛️"},
	"park":           {"park", "Прогулка в парке", "🌳"},
	"art-exhibition": {"art-exhibition", "Выставка картин", "🖼️"},
	"horses":         {"horses", "Прогулка на лошадях", "🐎"},
	"bowling":        {"bowling", "Боулинг", "🎳"},
	"fireworks-show": {"fireworks-show", "Фейерверк в поле (организованное шоу)", "🎆"},
	"karting":        {"karting", "Картинг", "🏎️"},
	"laser-tag":      {"laser-tag", "Лазертаг", "✨"},
	"dance":          {"dance", "Танцпол для двоих", "💃"},
	"dinner":         {"dinner", "Ужин в ресторане", "🍽️"},
	"street-drink":   {"street-drink", "Безалкогольный напиток на улице", "🥤"},
	"aroma-massage":  {"aroma-massage", "Массаж с аромасвечами", "🕯️"},

	// Legacy IDs are retained only so previously saved requests remain readable.
	"laser-tag-old": {"laser-tag-old", "Лазертаг", "✨"},
	"fireworks":     {"fireworks", "Посмотреть организованное фейерверочное шоу", "🎆"},
	"mini-golf":     {"mini-golf", "Мини-гольф", "⛳"},
}

var dateActivitiesByPosition = map[int]map[string]bool{
	1: {"coffee": true, "fast-food": true, "short-walk": true},
	2: {"twilight": true, "wheel": true, "museum": true, "park": true, "art-exhibition": true},
	3: {"horses": true, "bowling": true, "fireworks-show": true, "karting": true, "laser-tag": true, "dance": true},
	4: {"dinner": true, "street-drink": true, "aroma-massage": true},
}

type dateRouteItem struct {
	Position int    `json:"position"`
	Activity string `json:"activity"`
}

func createDateRequest(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Route []dateRouteItem `json:"route"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || len(in.Route) != 4 {
		fail(w, 400, "Маршрут должен содержать ровно четыре этапа")
		return
	}
	seenPositions := map[int]bool{}
	for _, item := range in.Route {
		if item.Position < 1 || item.Position > 4 || seenPositions[item.Position] {
			fail(w, 422, "Некорректный порядок этапов")
			return
		}
		if _, ok := dateActivities[item.Activity]; !ok || !dateActivitiesByPosition[item.Position][item.Activity] {
			fail(w, 422, "Это мероприятие недоступно для выбранного этапа")
			return
		}
		seenPositions[item.Position] = true
	}
	payload, err := json.Marshal(in.Route)
	if err != nil {
		fail(w, 500, "Не удалось сохранить маршрут")
		return
	}
	var id int64
	err = db.QueryRow(r.Context(), `INSERT INTO date_requests(route) VALUES($1) RETURNING id`, payload).Scan(&id)
	if err != nil {
		fail(w, 500, "Не удалось сохранить маршрут")
		return
	}
	ok(w, map[string]any{"ok": true, "id": id})
}

func ownerDateRequest(w http.ResponseWriter, r *http.Request) {
	var id int64
	var route json.RawMessage
	var confirmedAt string
	err := db.QueryRow(r.Context(), `SELECT id, route, confirmed_at::text FROM date_requests ORDER BY confirmed_at DESC LIMIT 1`).Scan(&id, &route, &confirmedAt)
	if err != nil {
		fail(w, 404, "Пока нет подтверждённого маршрута")
		return
	}
	var items []dateRouteItem
	if json.Unmarshal(route, &items) != nil {
		fail(w, 500, "Не удалось прочитать маршрут")
		return
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Position < items[j].Position })
	activities := make([]dateActivity, 0, len(items))
	for _, item := range items {
		activity, exists := dateActivities[item.Activity]
		if !exists {
			continue
		}
		activities = append(activities, activity)
	}
	ok(w, map[string]any{"id": id, "route": activities, "confirmedAt": strings.TrimSpace(confirmedAt)})
}
