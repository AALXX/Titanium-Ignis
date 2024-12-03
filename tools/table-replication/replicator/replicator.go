package replicator

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis"
)

// ReplicateAll replicates all rows from the PostgreSQL table to Redis
func ReplicateAll(postgresDB *sql.DB, redisClient *redis.Client, tableName string) error {
	query := fmt.Sprintf("SELECT * FROM %s", tableName)

	rows, err := postgresDB.Query(query)
	if err != nil {
		log.Printf("Error querying PostgreSQL table '%s': %v", tableName, err)
		return err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		log.Printf("Error fetching columns from table '%s': %v", tableName, err)
		return err
	}

	// Iterate over each row
	for rows.Next() {
		// Prepare row data
		columnValues := make([]interface{}, len(columns))
		columnPointers := make([]interface{}, len(columns))
		for i := range columnValues {
			columnPointers[i] = &columnValues[i]
		}

		// Scan row data
		if err := rows.Scan(columnPointers...); err != nil {
			log.Printf("Error scanning row from table '%s': %v", tableName, err)
			return err
		}

		// Create a map for the row
		rowMap := make(map[string]interface{})
		for i, colName := range columns {
			val := columnPointers[i].(*interface{})
			rowMap[colName] = *val
		}

		// Add a timestamp field
		rowMap["timestamp"] = time.Now().Unix()

		// Marshal row data to JSON
		rowJSON, err := json.Marshal(rowMap)
		if err != nil {
			log.Printf("Error marshaling row to JSON for table '%s': %v", tableName, err)
			return err
		}

		// Determine primary key
		primaryKey, ok := rowMap["service_token"]
		if !ok {
			log.Printf("Primary key 'service_token' not found in row: %v", rowMap)
			continue
		}
		primaryKeyStr := fmt.Sprintf("%v", primaryKey)

		// Write to Redis using primary key
		redisKey := fmt.Sprintf("%s:%s", tableName, primaryKeyStr)
		if err := redisClient.Set(redisKey, rowJSON, 0).Err(); err != nil {
			log.Printf("Error writing row to Redis with key '%s': %v", redisKey, err)
			return err
		}
		log.Printf("Replicated row with Redis key: %s", redisKey)

		
	}

	// Check for row iteration errors
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating rows for table '%s': %v", tableName, err)
		return err
	}

	log.Printf("Replication completed for table: %s", tableName)
	return nil
}

type Service struct {
	ServiceToken  string `json:"service_token"`
	ServiceName   string `json:"service_name"`
	ServiceID     int    `json:"service_id"`
	ServiceStatus string `json:"service_status"`
}

func insertIntoPostgres(db *sql.DB, service Service) error {
	query := `INSERT INTO active_services (service_token, service_name, service_id, service_status) VALUES ($1, $2, $3, $4)`
	_, err := db.Exec(query, service.ServiceToken, service.ServiceName, service.ServiceID, service.ServiceStatus)
	return err
}

func ProcessRedisToPostgres(redisClient *redis.Client, postgresDB *sql.DB) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		cursor := uint64(0)
		for {
			// Scan Redis keys with a limit of 100, excluding index keys
			keys, nextCursor, err := redisClient.Scan(cursor, "active_services:*", 100).Result()
			if err != nil {
				log.Printf("Failed to scan Redis keys: %v", err)
				break
			}
			cursor = nextCursor

			for _, key := range keys {
				// Skip index keys
				if key == "active_services:service_id_index" {
					continue
				}

				// Check if the key contains JSON data
				data, err := redisClient.Get(key).Result()
				if err == redis.Nil {
					log.Printf("Key %s does not exist", key)
					continue
				} else if err != nil {
					log.Printf("Failed to fetch data for key %s: %v", key, err)
					continue
				}

				// Parse JSON and check for a timestamp field
				var record map[string]interface{}
				if err := json.Unmarshal([]byte(data), &record); err != nil {
					log.Printf("Failed to parse JSON for key %s: %v", key, err)
					continue
				}

				log.Printf("record: %v", record)

				// Check if timestamp exists and is older than 2 minutes
				timestamp, ok := record["timestamp"].(float64)
				if !ok {
					log.Printf("Timestamp not found for key %s", key)
					continue
				}

				if time.Now().Unix()-int64(timestamp) < 300 {
					log.Printf("Key %s is not yet eligible for processing", key)
					continue
				}

				// Map JSON to the Service struct
				var service Service
				if err := json.Unmarshal([]byte(data), &service); err != nil {
					log.Printf("Failed to unmarshal JSON for key %s: %v", key, err)
					continue
				}

				// Insert into PostgreSQL
				if err := insertIntoPostgres(postgresDB, service); err != nil {
					log.Printf("Failed to insert data into PostgreSQL for key %s: %v", key, err)
					continue
				}

			}

			if cursor == 0 {
				break
			}
		}
	}
}
