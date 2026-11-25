package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	if err := loadConfig(); err != nil {
		log.Fatal(err)
	}

	var err error
	if db, err = pgxpool.New(context.Background(), os.Getenv("DATABASE_URL")); err != nil {
		log.Fatal(err)
	}
	log.Println("listening :8080")
	log.Fatal(http.ListenAndServe(":8080", routes()))
}
