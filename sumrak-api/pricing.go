package main

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"strings"

	"github.com/jackc/pgx/v5"
)

// Допустимые значения светопропускания. Значение «ath» — атермальная плёнка.
var validTintVLT = map[string]struct{}{
	"5": {}, "15": {}, "30": {}, "50": {}, "70": {}, "ath": {},
}

var templateRates = map[string]map[string]float64{
	"lights":  {"headlights": 2000, "taillights": 2000},
	"booking": {"front": 2000, "rear": 2000, "fs": 1000, "rs": 1000, "headlights": 1000, "taillights": 1000},
	"removal": {"front": 2000, "rear": 2000, "fs": 1000, "rs": 1000, "headlights": 1000, "taillights": 1000},
}

func ratesOrTemplate(rates, template map[string]float64) map[string]float64 {
	if rates != nil {
		return rates
	}
	copy := make(map[string]float64, len(template))
	for key, value := range template {
		copy[key] = value
	}
	return copy
}

func loadPricing(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}) (*Pricing, error) {
	var raw []byte
	if err := q.QueryRow(ctx, `SELECT value FROM settings WHERE key='pricing'`).Scan(&raw); err != nil {
		return nil, err
	}
	p := &Pricing{}
	if err := json.Unmarshal(raw, p); err != nil {
		return nil, err
	}
	p.Lights = ratesOrTemplate(p.Lights, templateRates["lights"])
	if _, ok := p.Lights["taillights"]; !ok {
		p.Lights["taillights"] = templateRates["lights"]["taillights"]
	}
	p.Booking = ratesOrTemplate(p.Booking, templateRates["booking"])
	p.Removal = ratesOrTemplate(p.Removal, templateRates["removal"])
	return p, nil
}

func priceElements(rates map[string]float64, elements []string) (int, error) {
	if len(elements) == 0 {
		return 0, errors.New("выберите элементы автомобиля")
	}
	seen, total := map[string]bool{}, 0.0
	for _, element := range elements {
		rate, ok := rates[element]
		if !ok || seen[element] {
			return 0, errors.New("неверный список элементов")
		}
		seen[element], total = true, total+rate
	}
	return int(math.Round(total/10) * 10), nil
}

// Единственное место расчёта: цена заданных элементов или сумма окон × тип автомобиля.
func price(p *Pricing, it *Item) error {
	m, ok := p.Types[it.Type]
	if it.Qty != 1 {
		return errors.New("каждая позиция может быть добавлена только один раз")
	}
	service := it.Service
	if service == "" {
		service = "tint"
	}
	switch service {
	case "booking", "removal":
		if len(it.Windows) > 0 || len(it.Lights) > 0 {
			return errors.New("неверный список элементов")
		}
		if len(it.Elements) != 1 {
			return errors.New("в одной позиции можно выбрать только один элемент")
		}
		rates := p.Booking
		if service == "removal" {
			rates = p.Removal
		}
		unit, err := priceElements(rates, it.Elements)
		if err != nil {
			return err
		}
		it.Service, it.Unit, it.Manual = service, unit, false
		return nil
	case "tint":
		if len(it.Elements) > 0 {
			return errors.New("неверный список элементов")
		}
	default:
		return errors.New("неизвестная услуга")
	}
	it.Service = service
	if !ok {
		return errors.New("неизвестный тип автомобиля")
	}
	if m == nil { // «Другое»
		if len(it.Windows) > 0 || len(it.Lights) > 0 {
			return errors.New("неверный список элементов")
		}
		if strings.TrimSpace(it.Note) == "" {
			return errors.New("опишите автомобиль")
		}
		it.Manual, it.Unit, it.Windows = true, 0, nil
		return nil
	}
	if _, ok := validTintVLT[it.VLT]; !ok {
		return errors.New("выберите окна или фары и плёнку")
	}
	elementCount := len(it.Windows) + len(it.Lights)
	if elementCount == 0 {
		return errors.New("выберите окно или фару")
	}
	if elementCount > 1 {
		return errors.New("в одной позиции можно выбрать только один элемент")
	}
	if it.VLT == "ath" {
		found := false
		for _, c := range p.Colors {
			found = found || c == it.Color
		}
		if !found {
			return errors.New("выберите цвет атермальной плёнки")
		}
	} else {
		it.Color = ""
	}
	seen, base := map[string]bool{}, 0.0
	for _, w := range it.Windows {
		wp, ok := p.Windows[w]
		if !ok || seen[w] {
			return errors.New("неверный список окон")
		}
		seen[w], base = true, base+wp
	}
	for _, light := range it.Lights {
		price, ok := p.Lights[light]
		if !ok || seen["light:"+light] {
			return errors.New("неверный список фар")
		}
		seen["light:"+light], base = true, base+price
	}
	it.Unit, it.Manual = int(math.Round(base**m/10)*10), false
	return nil
}

func claimTargets(seen map[string]bool, it Item) error {
	targets := make([]string, 0, len(it.Windows)+len(it.Lights)+len(it.Elements))
	for _, window := range it.Windows {
		targets = append(targets, "window:"+window)
	}
	for _, light := range it.Lights {
		targets = append(targets, "light:"+light)
	}
	for _, element := range it.Elements {
		switch element {
		case "front", "rear", "fs", "rs":
			targets = append(targets, "window:"+element)
		case "headlights", "taillights":
			targets = append(targets, "light:"+element)
		default:
			targets = append(targets, "element:"+element)
		}
	}
	for _, target := range targets {
		if seen[target] {
			return errors.New("один и тот же элемент нельзя добавить в заказ повторно")
		}
		seen[target] = true
	}
	return nil
}

func claimManualPosition(seen map[string]bool, it Item) error {
	if !it.Manual {
		return nil
	}
	note := strings.ToLower(strings.TrimSpace(it.Note))
	if seen[note] {
		return errors.New("такая позиция уже добавлена в заказ")
	}
	seen[note] = true
	return nil
}

func totals(items []Item) (sum, manual int) {
	for _, it := range items {
		if it.Manual {
			manual += it.Qty
		} else {
			sum += it.Unit * it.Qty
		}
	}
	return
}
