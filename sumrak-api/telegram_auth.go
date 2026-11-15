package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

var errInvalidTelegramInitData = errors.New("invalid Telegram initData")

func validateTelegramInitData(initData, botToken string, now time.Time) error {
	if botToken == "" || initData == "" {
		return errInvalidTelegramInitData
	}

	values, err := url.ParseQuery(initData)
	if err != nil {
		return errInvalidTelegramInitData
	}
	for _, fieldValues := range values {
		if len(fieldValues) != 1 {
			return errInvalidTelegramInitData
		}
	}

	hashValues, ok := values["hash"]
	if !ok {
		return errInvalidTelegramInitData
	}
	providedHash, err := hex.DecodeString(hashValues[0])
	if err != nil || len(providedHash) != sha256.Size {
		return errInvalidTelegramInitData
	}

	authDates, ok := values["auth_date"]
	if !ok {
		return errInvalidTelegramInitData
	}
	authUnix, err := strconv.ParseInt(authDates[0], 10, 64)
	if err != nil {
		return errInvalidTelegramInitData
	}
	authTime := time.Unix(authUnix, 0)
	if authTime.After(now.Add(30*time.Second)) || now.Sub(authTime) > 24*time.Hour {
		return errInvalidTelegramInitData
	}

	keys := make([]string, 0, len(values)-1)
	for key := range values {
		if key != "hash" {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)
	lines := make([]string, 0, len(keys))
	for _, key := range keys {
		lines = append(lines, key+"="+values.Get(key))
	}
	dataCheckString := strings.Join(lines, "\n")

	secretMAC := hmac.New(sha256.New, []byte("WebAppData"))
	secretMAC.Write([]byte(botToken))
	checkMAC := hmac.New(sha256.New, secretMAC.Sum(nil))
	checkMAC.Write([]byte(dataCheckString))
	if !hmac.Equal(providedHash, checkMAC.Sum(nil)) {
		return errInvalidTelegramInitData
	}
	return nil
}
