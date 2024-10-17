package config

import (
	"database/sql"
	"os"

	"fmt"

	_ "github.com/lib/pq"
)

func InitDB() (*sql.DB, error) {

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

	return db, nil
}
