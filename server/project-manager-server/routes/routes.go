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

	///////////////////////////////////////////////////////////////
	// 						PROJECTS							 //
	///////////////////////////////////////////////////////////////

	app.Post("/api/projects/add-project", func(c fiber.Ctx) error {
		return services.AddProjectEntry(c, db)
	})

	app.Post("/api/projects/create-project", func(c fiber.Ctx) error {
		return services.CreateProject(c, db)
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

	app.Post("/api/projects/new-folder", func(c fiber.Ctx) error {
		return services.CreateNewDirectory(c, db)
	})

	app.Post("/api/projects/new-file", func(c fiber.Ctx) error {
		return services.CreateNewFile(c, db)
	})

	app.Delete("/api/projects/delete-file", func(c fiber.Ctx) error {
		return services.DeleteFile(c, db)
	})

	///////////////////////////////////////////////////////////////
	// 						REPOSITORIES						 //
	///////////////////////////////////////////////////////////////

	app.Post("/api/repositories/generate-repository", func(c fiber.Ctx) error {
		return services.GenerateRepository(c, db)

	})

	app.Post("/api/repositories/create", func(c fiber.Ctx) error {
		return services.CreateRepo(c, db)
	})

	app.Get("/api/repositories/:repo/info/refs", func(c fiber.Ctx) error {
		return services.HandleInfoRefs(c)
	})

	app.Post("/api/repositories/:repo/git-upload-pack", func(c fiber.Ctx) error {
		return services.HandleRPC(c)
	})

	app.Post("/api/repositories/:repo/git-receive-pack", func(c fiber.Ctx) error {
		return services.HandleRPC(c)
	})
}
