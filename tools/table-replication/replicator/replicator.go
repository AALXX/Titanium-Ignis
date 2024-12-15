package replicator

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis"
)

// ReplicateAll replicates all rows from the PostgreSQL table to Redis <Not Working>
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

	for rows.Next() {
		columnValues := make([]interface{}, len(columns))
		columnPointers := make([]interface{}, len(columns))
		for i := range columnValues {
			columnPointers[i] = &columnValues[i]
		}

		if err := rows.Scan(columnPointers...); err != nil {
			log.Printf("Error scanning row from table '%s': %v", tableName, err)
			return err
		}

		rowMap := make(map[string]interface{})
		for i, colName := range columns {
			val := columnPointers[i].(*interface{})
			rowMap[colName] = *val
		}

		rowMap["timestamp"] = time.Now().Unix()

		primaryKey, ok := rowMap["service_token"]
		if !ok {
			log.Printf("Primary key 'service_token' not found in row: %v", rowMap)
			continue
		}

		// New Redis hash storage approach
		projectToken, ok := rowMap["project_token"].(string)
		if !ok {
			log.Printf("Project token not found in row: %v", rowMap)
			continue
		}

		primaryKeyStr := fmt.Sprintf("%v", primaryKey)

		// Use hSet to store in a hash per project token
		redisKey := fmt.Sprintf("active_services:%s", projectToken)
		if err := redisClient.HSet(redisKey, primaryKeyStr, rowMap).Err(); err != nil {
			log.Printf("Error writing row to Redis hash '%s': %v", redisKey, err)
			return err
		}

		// Maintain a set of service tokens for the project
		if err := redisClient.SAdd(fmt.Sprintf("active_services_tokens:%s", projectToken), primaryKeyStr).Err(); err != nil {
			log.Printf("Error adding service token to set: %v", err)
			return err
		}

		log.Printf("Replicated row with Redis hash key: %s, field: %s", redisKey, primaryKeyStr)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating rows for table '%s': %v", tableName, err)
		return err
	}

	log.Printf("Replication completed for table: %s", tableName)
	return nil
}

type Service struct {
	ProjctToken   string `json:"project_token"`
	ServiceToken  string `json:"service_token"`
	ServiceName   string `json:"service_name"`
	ServiceID     int    `json:"service_id"`
	ServiceStatus string `json:"service_status"`
}

func insertIntoPostgres(db *sql.DB, service Service) error {
	query := `INSERT INTO active_services (project_token, service_token, service_name, service_id, service_status) VALUES ($1, $2, $3, $4, $5)`
	_, err := db.Exec(query, service.ProjctToken, service.ServiceToken, service.ServiceName, service.ServiceID, service.ServiceStatus)
	return err
}

func ProcessRedisToPostgres(redisClient *redis.Client, postgresDB *sql.DB) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Scan for active_services hashes
		keysResult, err := redisClient.Keys("active_services:*").Result()
		if err != nil {
			log.Printf("Failed to scan Redis keys: %v", err)
			continue
		}

		for _, key := range keysResult {
			// Get all hash fields
			serviceData, err := redisClient.HGetAll(key).Result()
			if err != nil {
				log.Printf("Failed to get hash data for %s: %v", key, err)
				continue
			}

			for _, serviceJSON := range serviceData {
				var service Service
				if err := json.Unmarshal([]byte(serviceJSON), &service); err != nil {
					log.Printf("Failed to unmarshal service: %v", err)
					continue
				}

				// Check timestamp (assuming timestamp is part of the JSON)
				var serviceMap map[string]interface{}
				json.Unmarshal([]byte(serviceJSON), &serviceMap)

				timestamp, ok := serviceMap["timestamp"].(float64)
				if !ok || time.Now().Unix()-int64(timestamp) < 300 {
					continue
				}

				// Insert into PostgreSQL
				if err := insertIntoPostgres(postgresDB, service); err != nil {
					log.Printf("Failed to insert service: %v", err)
					continue
				}

				log.Printf("Inserted service: %+v", service)

			}
		}
	}
}
