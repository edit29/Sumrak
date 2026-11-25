package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"testing"
	"time"
)

func signedTelegramInitData(botToken string, authTime time.Time) string {
	values := url.Values{
		"auth_date": {strconv.FormatInt(authTime.Unix(), 10)},
		"query_id":  {"AAEAAAE"},
		"user":      {`{"id":123,"first_name":"Ivan"}`},
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	lines := make([]string, 0, len(keys))
	for _, key := range keys {
		lines = append(lines, key+"="+values.Get(key))
	}
	secretMAC := hmac.New(sha256.New, []byte("WebAppData"))
	secretMAC.Write([]byte(botToken))
	checkMAC := hmac.New(sha256.New, secretMAC.Sum(nil))
	checkMAC.Write([]byte(strings.Join(lines, "\n")))
	values.Set("hash", hex.EncodeToString(checkMAC.Sum(nil)))
	return values.Encode()
}

func TestValidateTelegramInitData(t *testing.T) {
	now := time.Now().UTC()
	token := "bot-token"
	valid := signedTelegramInitData(token, now)

	tests := []struct {
		name      string
		initData  string
		token     string
		now       time.Time
		wantError bool
	}{
		{name: "valid", initData: valid, token: token, now: now},
		{name: "tampered user", initData: strings.Replace(valid, "Ivan", "Eve", 1), token: token, now: now, wantError: true},
		{name: "expired", initData: signedTelegramInitData(token, now.Add(-25*time.Hour)), token: token, now: now, wantError: true},
		{name: "future auth date", initData: signedTelegramInitData(token, now.Add(time.Minute)), token: token, now: now, wantError: true},
		{name: "missing token", initData: valid, now: now, wantError: true},
		{name: "malformed query", initData: "auth_date=%zz", token: token, now: now, wantError: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateTelegramInitData(test.initData, test.token, test.now)
			if (err != nil) != test.wantError {
				t.Fatalf("validateTelegramInitData() error = %v, wantError %v", err, test.wantError)
			}
		})
	}
}

func TestGuardAllowsMiniAppOriginOnlyForTelegramRoutes(t *testing.T) {
	previousOrigin, previousMiniAppOrigin := origin, miniAppOrigin
	origin, miniAppOrigin = "https://site.example", "https://mini.example"
	t.Cleanup(func() {
		origin, miniAppOrigin = previousOrigin, previousMiniAppOrigin
	})

	handler := guard(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	for _, test := range []struct {
		path       string
		wantStatus int
	}{
		{path: "/api/telegram/orders", wantStatus: http.StatusNoContent},
		{path: "/api/owner/login", wantStatus: http.StatusForbidden},
	} {
		request := httptest.NewRequest(http.MethodPost, test.path, nil)
		request.Header.Set("Origin", miniAppOrigin)
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != test.wantStatus {
			t.Errorf("%s returned %d, want %d", test.path, response.Code, test.wantStatus)
		}
	}
}
