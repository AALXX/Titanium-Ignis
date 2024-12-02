package services

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"

	"database/sql"
	"project-manager-server/lib"
	"project-manager-server/models"

	"github.com/gofiber/fiber/v3"
)

func CreateProjectEntry(c fiber.Ctx, db *sql.DB) error {

	//Get body from request
	body := new(models.ProjectRequest)

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}

	userPrivateToken := lib.GetPrivateTokenBySessionToken(body.SessionToken, db)
	// Check if the URL ends with .git and add it if not
	repoURL := body.Repo_url
	if !strings.HasSuffix(repoURL, ".git") {
		repoURL = fmt.Sprintf("%s.git", repoURL)
	}

	projectType := strings.ToLower(body.Type)

	projectToken := lib.CreateToken()
	RepoPath := os.Getenv("REPOSITORIES_FOLDER_PATH")

	rows, err := db.Query("INSERT INTO projects (project_name, project_token, repo_url, checked_out_by, status, type) VALUES ($1, $2, $3, $4, $5, $6);", body.Project_name, projectToken, repoURL, userPrivateToken, "checking-out", projectType)
	if err != nil {
		log.Println("Error creating project entry in database:", err)
		return c.Status(500).SendString("Failed to create project entry in database")
	}
	defer rows.Close()

	// Clone or checkout the repository
	var cmd *exec.Cmd
	if projectType == "git" {
		cmd = exec.Command("git", "clone", repoURL, projectToken)
	} else if projectType == "svn" {
		cmd = exec.Command("svn", "checkout", repoURL, projectToken)
	}

	cmd.Dir = RepoPath
	err = cmd.Run()
	if err != nil {
		log.Println("Error updating project status:", err)

		return c.Status(500).SendString("Failed to check out project")
	}


	projectConfig := models.ProjectConfig{
		Services: []models.ProjectService{},
	}

	// Convert to JSON
	jsonConfig, err := json.Marshal(projectConfig)
	if err != nil {
		return err
	}

	os.WriteFile(fmt.Sprintf("%s/%s/project-config.json", RepoPath, projectToken), []byte(jsonConfig), 0644)

	// Update project status in database
	_, err = db.Exec("UPDATE projects SET status = 'checked-out' WHERE project_token = $1", projectToken)
	if err != nil {
		log.Println("Error updating project status:", err)
		return c.Status(500).SendString("Failed to update project status")
	}

	return c.JSON(fiber.Map{
		"error": false,
	})
}

func GetRepositoryTree(c fiber.Ctx, db *sql.DB) error {
	repoToken := c.Query("projectToken")

	RepoPath := os.Getenv("REPOSITORIES_FOLDER_PATH")

	tree, err := lib.GetDirectoryStructure(fmt.Sprintf("%s/%s", RepoPath, repoToken))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to get directory structure")
	}

	return c.JSON(tree)
}

func GetRepositoryFile(c fiber.Ctx, db *sql.DB) error {
	filePath := c.Query("path")
	projectToken := c.Query("projectToken")


	if !strings.HasPrefix(filePath, filePath) {
		return c.Status(403).SendString("Access to this file is not allowed")
	}

	content, err := lib.GetFileContents(fmt.Sprintf("%s/%s/%s", os.Getenv("REPOSITORIES_FOLDER_PATH"), projectToken, filePath))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to read file")
	}

	return c.SendString(content)
}

func SaveRepositoryFile(c fiber.Ctx, db *sql.DB) error {

	body := new(models.SaveFileRequest)

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}

	RepoPath := os.Getenv("REPOSITORIES_FOLDER_PATH")

	fullFilePath := fmt.Sprintf("%s/%s/%s", RepoPath, body.ProjectToken, body.Path)
	err := lib.SaveFile(fullFilePath, body.Content)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to save file")
	}

	return c.SendString("File saved successfully")
}
