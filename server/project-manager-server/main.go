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

	// Initialize the database connection
	db, err := config.InitDB()
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Create a Fiber app
	app := fiber.New()

	// Enable CORS middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: cors.ConfigDefault.AllowOrigins,
		AllowMethods: fiber.DefaultMethods,
	}))

	// Initialize routes
	routes.InitRoutes(app, db)

	// Start the server
	log.Fatal(app.Listen("0.0.0.0:5200"))
}