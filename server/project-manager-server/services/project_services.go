package services

import (
	"os/exec"

	"database/sql"
	"github.com/gofiber/fiber/v3"
	"project-manager-server/lib"
	"project-manager-server/models"
)

func CreateProjectEntry(c fiber.Ctx, db *sql.DB) error {

	//Get body from request
	body := new(models.Project)
	// body.Project_name = c.FormValue("projectName");

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}

	projectToken := lib.CreateToken()

	rows, err := db.Query("INSERT INTO projects (project_name, project_token, repo_url, checked_out_by, status, type) VALUES ($1, $2, $3, $4, $5, $6);", body.Project_name, projectToken, body.Repo_url, body.Checked_out_by, "checking-out", body.Type)
	if err != nil {
		return c.Status(500).SendString("Failed to check out project")
	}
	defer rows.Close()

	// Clone or checkout the repository
	var cmd *exec.Cmd
	if body.Type == "git" {
		cmd = exec.Command("git", "clone", body.Repo_url, body.Project_name)
	} else if body.Type == "svn" {
		cmd = exec.Command("svn", "checkout", body.Repo_url, body.Project_name)
	}

	cmd.Dir = "../repos" // Set the directory where repositories will be checked out
	err = cmd.Run()
	if err != nil {
		return c.Status(500).SendString("Failed to check out project")
	}

	// Update project status in database
	_, err = db.Exec("UPDATE projects SET status = 'checked-out' WHERE project_token = ?", projectToken)
	if err != nil {
		return c.Status(500).SendString("Failed to update project status")
	}

	return c.JSON(fiber.Map{
		"error": false,
	})
}
