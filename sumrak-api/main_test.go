package main

import (
	"encoding/json"
	"testing"
)

func TestOrderDecodesCarName(t *testing.T) {
	var order Order
	if err := json.Unmarshal([]byte(`{"carName":"Toyota Camry"}`), &order); err != nil {
		t.Fatalf("expected car name to decode, got %v", err)
	}
	if order.CarName != "Toyota Camry" {
		t.Fatalf("expected car name Toyota Camry, got %q", order.CarName)
	}
}

func testPricing() *Pricing {
	sedan := 1.0
	return &Pricing{
		Windows: map[string]float64{"front": 4000, "rear": 4000, "fs": 2000, "rs": 2000},
		Types:   map[string]*float64{"sedan": &sedan, "kei": nil, "other": nil},
		Colors:  []string{"green"},
		Lights:  map[string]float64{"headlights": 2000, "taillights": 2000},
		Booking: map[string]float64{"front": 2000, "rear": 2000, "fs": 1000, "rs": 1000, "headlights": 1000, "taillights": 1000},
		Removal: map[string]float64{"front": 2000, "rear": 2000, "fs": 1000, "rs": 1000, "headlights": 1000, "taillights": 1000},
	}
}

func TestPriceRejectsMultipleCopiesOfPosition(t *testing.T) {
	item := Item{
		Type: "sedan", Windows: []string{"front"}, VLT: "30", Qty: 2,
	}
	if err := price(testPricing(), &item); err == nil {
		t.Fatal("expected qty greater than one to be rejected")
	}

	item.Qty = 1
	if err := price(testPricing(), &item); err != nil {
		t.Fatalf("expected one position to be accepted, got %v", err)
	}
}

func TestClaimTargetsRejectsRepeatedWindow(t *testing.T) {
	seen := map[string]bool{}
	if err := claimTargets(seen, Item{Windows: []string{"front", "rear"}}); err != nil {
		t.Fatalf("expected distinct windows to be accepted, got %v", err)
	}
	if err := claimTargets(seen, Item{Windows: []string{"front"}}); err == nil {
		t.Fatal("expected a window already in the order to be rejected")
	}
	if err := claimTargets(seen, Item{Windows: []string{"side"}}); err != nil {
		t.Fatalf("expected a different window to be accepted, got %v", err)
	}
}

func TestPriceIncludesTintedHeadlights(t *testing.T) {
	item := Item{
		Type: "sedan", Lights: []string{"headlights"},
		VLT: "30", Qty: 1,
	}
	if err := price(testPricing(), &item); err != nil {
		t.Fatalf("expected tinted windows and headlights to be accepted, got %v", err)
	}
	if item.Unit != 2000 {
		t.Fatalf("expected unit price 2000, got %d", item.Unit)
	}
}

func TestPriceIncludesTintedTaillights(t *testing.T) {
	item := Item{
		Type: "sedan", Lights: []string{"taillights"},
		VLT: "30", Qty: 1,
	}
	if err := price(testPricing(), &item); err != nil {
		t.Fatalf("expected tinted taillights to be accepted, got %v", err)
	}
	if item.Unit != 2000 {
		t.Fatalf("expected unit price 2000, got %d", item.Unit)
	}
}

func TestPriceDoesNotMultiplyByVLT(t *testing.T) {
	p := testPricing()
	sedan := 1.2
	p.Types["sedan"] = &sedan
	for _, vlt := range []string{"5", "15", "30", "50", "70", "ath"} {
		t.Run(vlt, func(t *testing.T) {
			item := Item{Type: "sedan", Windows: []string{"front"}, VLT: vlt, Color: "green", Qty: 1}
			if err := price(p, &item); err != nil {
				t.Fatalf("expected tint price for VLT %s, got %v", vlt, err)
			}
			if item.Unit != 4800 {
				t.Fatalf("expected unit price 4800 based only on vehicle multiplier, got %d", item.Unit)
			}
		})
	}
}

func TestPriceRejectsUnsupportedVLT(t *testing.T) {
	item := Item{Type: "sedan", Windows: []string{"front"}, VLT: "80", Qty: 1}
	if err := price(testPricing(), &item); err == nil {
		t.Fatal("expected unsupported VLT to be rejected")
	}
}

func TestPriceFixedElementServices(t *testing.T) {
	tests := []struct {
		name     string
		service  string
		elements []string
		want     int
	}{
		{name: "booking", service: "booking", elements: []string{"headlights"}, want: 1000},
		{name: "removal", service: "removal", elements: []string{"front"}, want: 2000},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			item := Item{Service: tt.service, Elements: tt.elements, Qty: 1}
			if err := price(testPricing(), &item); err != nil {
				t.Fatalf("expected service elements to be accepted, got %v", err)
			}
			if item.Unit != tt.want || item.Manual {
				t.Fatalf("expected fixed price %d, got unit=%d manual=%t", tt.want, item.Unit, item.Manual)
			}
		})
	}
}

func TestPriceRejectsMultipleElementsPerPosition(t *testing.T) {
	tests := []struct {
		name string
		item Item
	}{
		{
			name: "tint multiple windows",
			item: Item{Type: "sedan", Windows: []string{"front", "rear"}, VLT: "30", Qty: 1},
		},
		{
			name: "tint window and headlight",
			item: Item{Type: "sedan", Windows: []string{"front"}, Lights: []string{"headlights"}, VLT: "30", Qty: 1},
		},
		{
			name: "booking multiple elements",
			item: Item{Service: "booking", Elements: []string{"front", "rear"}, Qty: 1},
		},
		{
			name: "removal multiple elements",
			item: Item{Service: "removal", Elements: []string{"front", "headlights"}, Qty: 1},
		},
		{
			name: "manual type with multiple elements",
			item: Item{Type: "other", Windows: []string{"front", "rear"}, Note: "Автомобиль", Qty: 1},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := price(testPricing(), &tt.item); err == nil {
				t.Fatal("expected multiple elements in one position to be rejected")
			}
		})
	}
}

func TestClaimTargetsRejectsSameElementAcrossServices(t *testing.T) {
	seen := map[string]bool{}
	if err := claimTargets(seen, Item{Service: "tint", Windows: []string{"front"}}); err != nil {
		t.Fatalf("expected tinting to be accepted, got %v", err)
	}
	if err := claimTargets(seen, Item{Service: "booking", Elements: []string{"front"}}); err == nil {
		t.Fatal("expected the same glass to be rejected across services")
	}
	if err := claimTargets(seen, Item{Service: "booking", Elements: []string{"headlights"}}); err != nil {
		t.Fatalf("expected a different vehicle element to be accepted, got %v", err)
	}
	if err := claimTargets(seen, Item{Service: "removal", Elements: []string{"headlights"}}); err == nil {
		t.Fatal("expected the same headlight to be rejected across services")
	}
}

func TestClaimManualPositionRejectsSameDescription(t *testing.T) {
	seen := map[string]bool{}
	first := Item{Manual: true, Note: "  Фургон для оценки "}
	if err := claimManualPosition(seen, first); err != nil {
		t.Fatalf("expected first manual position to be accepted, got %v", err)
	}
	if err := claimManualPosition(seen, Item{Manual: true, Note: "фургон для оценки"}); err == nil {
		t.Fatal("expected an identical manual position to be rejected")
	}
	if err := claimManualPosition(seen, Item{Manual: true, Note: "Автобус для оценки"}); err != nil {
		t.Fatalf("expected a different manual position to be accepted, got %v", err)
	}
}
