package main

import (
	"log"
	"os"
	"project-manager-server/config"

	// "project-manager-server/lib"
	"project-manager-server/routes"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/joho/godotenv"
)

func main() {
	// Load the environment variables from the .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Get the server host from the environment variable
	serverHost := os.Getenv("SERVER_HOST")
	if serverHost == "" {
		log.Fatalf("SERVER_HOST environment variable not set")
	}

	serverPORT := os.Getenv("PORT")
	if serverPORT == "" {
		log.Fatalf("SERVER_PORT environment variable not set")
	}

	// Initialize the database connection
	db, err := config.InitDB()
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Create a Fiber app
	app := fiber.New(fiber.Config{
		StreamRequestBody: true,
		ReadBufferSize:    4096,
		WriteBufferSize:   4096,
		BodyLimit:         50 * 1024 * 1024, // 50MB limit
	})

	// Modify the CORS configuration:
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "HEAD", "PUT", "DELETE", "PATCH"},
		AllowHeaders: []string{"*"},
	}))

	// Initialize routes
	routes.InitRoutes(app, db)

	// Start the server
	log.Fatal(app.Listen("0.0.0.0:" + serverPORT))

}
