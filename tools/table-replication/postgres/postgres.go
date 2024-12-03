package postgres

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

func InitPostgresDB() (*sql.DB, error) {

	// Access the environment variables
	dbHost := os.Getenv("POSTGRESQL_HOST")
	dbPort := os.Getenv("POSTGRESQL_PORT")
	dbUser := os.Getenv("POSTGRESQL_USER")
	dbPass := os.Getenv("POSTGRESQL_PASS")
	dbName := os.Getenv("POSTGRESQL_DB")

	// Construct the data source name
	dataSourceName := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost,
		dbPort,
		dbUser,
		dbPass,
		dbName,
	)

	// Open a database connection
	db, err := sql.Open("postgres", dataSourceName)
	if err != nil {
		return nil, err
	}

	// Check if the connection is valid by pinging the database
	if err := db.Ping(); err != nil {
		db.Close() // Close the connection
		return nil, err
	}

	// Test connection
	if err = db.Ping(); err != nil {
		log.Fatalf("Cannot connect to PostgreSQL: %v", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)
	return db, nil
}
