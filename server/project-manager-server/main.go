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

func loadEnvFile() {
	// Try to load .env file if it exists, but don't fail if it doesn't
	// This allows for both .env file and environment variable usage
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	} else {
		log.Println("Loaded environment from .env file")
	}
}

func main() {
	loadEnvFile()

	serverHost := os.Getenv("SERVER_HOST")
	if serverHost == "" {
		serverHost = "0.0.0.0:5600"
	}
	log.Printf("Server will listen on %s\n", serverHost)

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

	routes.InitRoutes(app, db)

	// Start the server
	log.Printf("Server is attempting to listen on %s\n", serverHost)
	if err := app.Listen(serverHost + ":" + serverPORT); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}

}
