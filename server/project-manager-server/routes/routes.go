package routes

import (
	"database/sql"
	"github.com/gofiber/fiber/v3"
	"project-manager-server/services"
)

func InitRoutes(app *fiber.App, db *sql.DB) {
	// Example route
	app.Post("/api/projects/create-project-entry", func(c fiber.Ctx) error {
		return services.CreateProjectEntry(c, db)
	})

	// Add other routes here...
}