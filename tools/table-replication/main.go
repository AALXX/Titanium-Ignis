package main

import (
	"log"
	"replication-tool/postgres"
	"replication-tool/redis"
	"replication-tool/replicator"

	// "your-module/internal/config"
	// "your-module/internal/postgres"
	// "your-module/internal/redis"
	// "your-module/internal/replicator"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	postgresDB, err := postgres.InitPostgresDB()
	if err != nil {
		log.Fatal(err)
	}
	defer postgresDB.Close()

	redisClient, err := redis.InitRedisDB()
	if err != nil {
		log.Fatal(err)
	}
	defer redisClient.Close()

	tableName := "active_services"

	// Periodic replication
	log.Println("Starting table replication...")
	replicateErr := replicator.ReplicateAll(postgresDB, redisClient, tableName)
	if replicateErr != nil {
		log.Printf("Replication error: %v", err)
	}

	replicator.ProcessRedisToPostgres(redisClient, postgresDB)
}
