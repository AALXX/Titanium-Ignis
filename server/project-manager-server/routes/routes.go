package routes

import (
	"database/sql"
	"github.com/gofiber/fiber/v3"
	"project-manager-server/middleware"
	"project-manager-server/services"
)

func InitRoutes(app *fiber.App, db *sql.DB) {
	app.Use(middleware.XSSMiddleware())

	// Or with custom config
	app.Use(middleware.XSSMiddleware(middleware.XSSConfig{
		SkipPaths:    []string{"/api/projects/repo-file"},
		StrictPolicy: false, // Use UGC policy instead of strict
	}))
 
	// Example route
	app.Post("/api/projects/create-project-entry", func(c fiber.Ctx) error {
		return services.CreateProjectEntry(c, db)
	})

	app.Get("/api/projects/repo-tree", func(c fiber.Ctx) error {
		return services.GetRepositoryTree(c, db)
	})

	app.Get("/api/projects/repo-file", func(c fiber.Ctx) error {
		return services.GetRepositoryFile(c, db)
	})

}
