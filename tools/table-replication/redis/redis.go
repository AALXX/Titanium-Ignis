package redis

import (
	"fmt"
	"log"
	"os"

	"github.com/go-redis/redis"
)

func InitRedisDB() (*redis.Client, error) {
	// Access the Redis environment variables 
	redisHost := os.Getenv("REDIS_HOST")
	redisPort := os.Getenv("REDIS_PORT")
	redisPass := os.Getenv("REDIS_PASS")

	// Construct Redis connection address
	redisAddr := fmt.Sprintf("%s:%s", redisHost, redisPort)

	// Create Redis client
	redisDB := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPass,
	})

	// Check if the connection is valid by pinging the database
	if err := redisDB.Ping().Err(); err != nil {
		log.Printf("Cannot connect to Redis: %v", err)
		return nil, err
	}

	return redisDB, nil
}