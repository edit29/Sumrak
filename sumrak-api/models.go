package main

type Pricing struct {
	Windows map[string]float64  `json:"windows"`
	Types   map[string]*float64 `json:"types"` // null = ручная оценка
	Colors  []string            `json:"colors"`
	Lights  map[string]float64  `json:"lights"`
	Booking map[string]float64  `json:"booking"`
	Removal map[string]float64  `json:"removal"`
}

type PublicPricing struct {
	Windows map[string]float64 `json:"windows"`
	Lights  map[string]float64 `json:"lights"`
	Booking map[string]float64 `json:"booking"`
	Removal map[string]float64 `json:"removal"`
}

type Item struct {
	Type     string   `json:"type"`
	Service  string   `json:"service,omitempty"`
	Windows  []string `json:"windows"`
	Lights   []string `json:"lights,omitempty"`
	Elements []string `json:"elements,omitempty"`
	VLT      string   `json:"vlt"`
	Color    string   `json:"color,omitempty"`
	Qty      int      `json:"qty"`
	Note     string   `json:"note,omitempty"`
	Unit     int      `json:"unit"` // считает только сервер
	Manual   bool     `json:"manual"`
}

type Order struct {
	Name, Phone, WishDate, WishTime, Comment string
	CarName                                  string `json:"carName"`
	Consent                                  bool
	Items                                    []Item
	PhotoIDs                                 []string
}
