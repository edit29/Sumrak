package main

import (
	"net/url"
	"strconv"
	"testing"
	"time"
)

func TestNormalizeTelegramUsername(t *testing.T) {
	cases := map[string]string{"@Ivan_Master": "ivan_master", "  master_01 ": "master_01", "ab": "", "has space": "", "@": "", "": "", "русский": ""}
	for in, want := range cases {
		if got := normalizeTelegramUsername(in); got != want {
			t.Errorf("normalizeTelegramUsername(%q) = %q, ожидали %q", in, got, want)
		}
	}
}

func TestParseTelegramAllowLists(t *testing.T) {
	names := parseTelegramUsernames("@Owner_One, second_owner ,bad name,,x")
	if len(names) != 2 || !names["owner_one"] || !names["second_owner"] {
		t.Errorf("usernames: %v", names)
	}
	ids := parseTelegramIDs("123, 456,abc,-5,0")
	if len(ids) != 2 || !ids[123] || !ids[456] {
		t.Errorf("ids: %v", ids)
	}
	if len(parseTelegramUsernames("")) != 0 || len(parseTelegramIDs("")) != 0 {
		t.Error("пустые списки должны давать пустой доступ")
	}
}

func TestTelegramUserFromInitData(t *testing.T) {
	at := time.Now().Add(-time.Minute).Truncate(time.Second)
	v := url.Values{"auth_date": {strconv.FormatInt(at.Unix(), 10)}, "user": {`{"id":4242,"first_name":"Иван","username":"Ivan_Master"}`}}
	u, ok := telegramUserFromInitData(v.Encode())
	if !ok || u.ID != 4242 || u.Username != "Ivan_Master" || !u.AuthDate.Equal(at) {
		t.Fatalf("неверный разбор: %+v %v", u, ok)
	}
	v.Set("user", `{"first_name":"Без id"}`)
	if _, ok := telegramUserFromInitData(v.Encode()); ok {
		t.Error("без id пользователя разбор должен отклоняться")
	}
	if _, ok := telegramUserFromInitData("auth_date=x&user=%7B%22id%22%3A1%7D"); ok {
		t.Error("с неверным auth_date разбор должен отклоняться")
	}
	if _, ok := telegramUserFromInitData("%zz"); ok {
		t.Error("с неверным форматом разбор должен отклоняться")
	}
}
