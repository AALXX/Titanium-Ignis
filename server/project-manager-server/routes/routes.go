package routes

import (
	"database/sql"

	"project-manager-server/middleware"
	"project-manager-server/services"

	"github.com/gofiber/fiber/v3"
)

func InitRoutes(app *fiber.App, db *sql.DB) {
	app.Use(middleware.XSSMiddleware(middleware.XSSConfig{
		SkipPaths: []string{
			"/api/projects/save-file",
		},
		StrictPolicy: false,
	}))

	// Regular HTTP routes
	app.Post("/api/projects/create-project-entry", func(c fiber.Ctx) error {
		return services.CreateProjectEntry(c, db)
	})

	app.Get("/api/projects/repo-tree", func(c fiber.Ctx) error {
		return services.GetRepositoryTree(c, db)
	})

	app.Get("/api/projects/repo-file", func(c fiber.Ctx) error {
		return services.GetRepositoryFile(c, db)
	})

	app.Post("/api/projects/save-file", func(c fiber.Ctx) error {
		return services.SaveRepositoryFile(c, db)
	})
}
