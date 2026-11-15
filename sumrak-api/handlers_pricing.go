package main

import (
	"encoding/json"
	"net/http"
)

func publicPricing(w http.ResponseWriter, r *http.Request) {
	p, err := loadPricing(r.Context(), db)
	if err != nil {
		fail(w, 500, "прайс недоступен")
		return
	}
	ok(w, PublicPricing{Windows: p.Windows, Lights: p.Lights, Booking: p.Booking, Removal: p.Removal})
}

func quote(w http.ResponseWriter, r *http.Request) {
	var o Order
	if json.NewDecoder(r.Body).Decode(&o) != nil {
		fail(w, 400, "неверный JSON")
		return
	}
	p, err := loadPricing(r.Context(), db)
	if err != nil {
		fail(w, 500, "прайс недоступен")
		return
	}
	seenTargets, seenManual := map[string]bool{}, map[string]bool{}
	for i := range o.Items {
		if err := price(p, &o.Items[i]); err != nil {
			fail(w, 422, err.Error())
			return
		}
		if err := claimTargets(seenTargets, o.Items[i]); err != nil {
			fail(w, 422, err.Error())
			return
		}
		if err := claimManualPosition(seenManual, o.Items[i]); err != nil {
			fail(w, 422, err.Error())
			return
		}
	}
	s, m := totals(o.Items)
	ok(w, map[string]any{"items": o.Items, "known_total": s, "manual_count": m})
}
