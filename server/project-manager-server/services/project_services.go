package services

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"database/sql"
	"project-manager-server/lib"
	"project-manager-server/models"

	"github.com/gofiber/fiber/v3"
)

func AddProjectEntry(c fiber.Ctx, db *sql.DB) error {

	//Get body from request
	body := new(models.AddProjectRequest)

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}

	userPrivateToken := lib.GetPrivateTokenBySessionToken(body.SessionToken, db)

	if userPrivateToken == "" {
		return c.Status(500).SendString("Failed to create project")
	}

	// Check if the URL ends with .git and add it if not
	repoURL := body.Repo_url
	if !strings.HasSuffix(repoURL, ".git") {
		repoURL = fmt.Sprintf("%s.git", repoURL)
	}

	projectType := strings.ToLower(body.Type)

	projectToken := lib.CreateToken()
	RepoPath := os.Getenv("PROJECTS_FOLDER_PATH")

	rows, err := db.Query("INSERT INTO projects (projectname, projecttoken, repo_url, checked_out_by, status, type) VALUES ($1, $2, $3, $4, $5, $6);", body.Project_name, projectToken, repoURL, userPrivateToken, "checking-out", projectType)
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

func CreateProject(c fiber.Ctx, db *sql.DB) error {

	body := new(models.CreateProjectRequest)
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}

	ProjectToken := lib.CreateToken()

	os.MkdirAll(fmt.Sprintf("%s/%s", os.Getenv("PROJECTS_FOLDER_PATH"), ProjectToken), 0755)
	os.WriteFile(fmt.Sprintf("%s/%s/project-config.json", os.Getenv("PROJECTS_FOLDER_PATH"), ProjectToken), []byte("{}"), 0644)

	userPrivateToken := lib.GetPrivateTokenBySessionToken(body.SessionToken, db)

	if userPrivateToken == "" {
		return c.Status(500).SendString("Failed to create project")
	}

	query := `
WITH project_insert AS (
    INSERT INTO projects (ProjectName, ProjectDescription, ProjectToken, ProjectOwnerToken, Status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ProjectToken
), 
codebase_insert AS (
    INSERT INTO projects_codebase (ProjectToken, RepositoryUrl, LastUserCommitUserToken, ProjectType)
    VALUES ((SELECT ProjectToken FROM project_insert), $6, $7, $8)
),
owner_role_insert AS (
    INSERT INTO projects_team_members (ProjectToken, UserPrivateToken, RoleId)
    VALUES ((SELECT ProjectToken FROM project_insert), $4, 1)
)
SELECT ProjectToken FROM project_insert;
`
	rows, err := db.Query(query,
		body.Project_name,
		body.Project_description,
		ProjectToken,
		userPrivateToken,
		"Started",
		"", // Empty RepositoryUrl
		userPrivateToken,
		strings.ToLower(body.Repo_type),
	)
	if err != nil {
		log.Println("Error creating project and codebase entry in database:", err)
		return c.Status(500).SendString("Failed to create project and codebase entry in database")
	}
	defer rows.Close()

	if body.Team_members != nil {
		for _, member := range body.Team_members {
			query := `
INSERT INTO projects_team_members (ProjectToken, UserPrivateToken, RoleId)
VALUES ($1, (SELECT userPrivateToken FROM users WHERE UserEmail = $2), (SELECT id FROM roles WHERE Name = $3));
`
			_, err = db.Exec(query, ProjectToken, member.Email, member.Role)
			if err != nil {
				log.Println("Error creating project team member entry in database:", err)
				return c.Status(500).SendString("Failed to create project team member entry in database")
			}
		}
	}

	return c.JSON(fiber.Map{
		"error": false,
	})
}

func GetRepositoryTree(c fiber.Ctx, db *sql.DB) error {
	projectToken := c.Query("projectToken")
	branch := c.Query("branch")

	fmt.Println("projectToken:", projectToken)
	fmt.Println("branch:", branch)

	if branch == "" {
		branch = "HEAD"
	}

	basePath, err := filepath.Abs(os.Getenv("REPOSITORIES_FOLDER_PATH"))
	if err != nil {
		log.Fatalf("Failed to resolve base path: %v", err)
	}

	gitDir := filepath.Join(basePath, projectToken+".git")

	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		log.Printf("Repository not found at: %s", gitDir)
		return c.Status(fiber.StatusNotFound).SendString("Repository not found")
	}

	tree, err := lib.GetDirectoryStructureFromGit(gitDir, branch, "")
	if err != nil {
		log.Printf("Failed to get tree: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString(fmt.Sprintf("Failed to get tree: %v", err))
	}
	log.Println(tree)
	return c.JSON(tree)
}

func GetRepositoryFile(c fiber.Ctx, db *sql.DB) error {
	filePath := c.Query("path")
	projectToken := c.Query("projectToken")
	branch := c.Query("branch")

	log.Println("filePath:", filePath)
	log.Println("projectToken:", projectToken)
	log.Println("branch:", branch)

	if branch == "" {
		branch = "HEAD"
	}

	if strings.Contains(filePath, "..") || strings.HasPrefix(filePath, "/") {
		return c.Status(fiber.StatusForbidden).SendString("Access to this file is not allowed")
	}


	basePath, err := filepath.Abs(os.Getenv("REPOSITORIES_FOLDER_PATH"))
	if err != nil {
		log.Fatalf("Failed to resolve base path: %v", err)
	}

	gitDir := filepath.Join(basePath, projectToken+".git")

	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).SendString("Repository not found")
	}

	content, err := getFileFromGitCatFile(gitDir, branch, filePath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString(fmt.Sprintf("Failed to read file: %v", err))
	}

	return c.SendString(content)
}

func getFileFromGitCatFile(gitDir, ref, filePath string) (string, error) {
	lsTreeCmd := exec.Command("git", "--git-dir="+gitDir, "ls-tree", "-r", ref, "--", filePath)
	output, err := lsTreeCmd.Output()
	if err != nil {
		return "", fmt.Errorf("file not found in repository")
	}

	parts := strings.Fields(string(output))
	if len(parts) < 3 {
		return "", fmt.Errorf("invalid git ls-tree output")
	}
	blobHash := parts[2]

	catFileCmd := exec.Command("git", "--git-dir="+gitDir, "cat-file", "-p", blobHash)
	content, err := catFileCmd.Output()
	if err != nil {
		return "", fmt.Errorf("git cat-file failed: %w", err)
	}

	return string(content), nil
}
func CreateNewDirectory(c fiber.Ctx, db *sql.DB) error {
	body := new(models.CreateNewDirectoryRequest)

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}
	RepoPath := os.Getenv("PROJECTS_FOLDER_PATH")

	fullFilePath := fmt.Sprintf("%s/%s/%s", RepoPath, body.ProjectToken, body.Path)

	err := os.MkdirAll(fullFilePath, 0755)
	if err != nil {
		log.Println(err)

		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create directory"})
	}

	return c.JSON(fiber.Map{"error": false})
}

func CreateNewFile(c fiber.Ctx, db *sql.DB) error {
	body := new(models.CreateNewFileRequest)

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}
	RepoPath := os.Getenv("PROJECTS_FOLDER_PATH")
	fullFilePath := fmt.Sprintf("%s/%s/%s", RepoPath, body.ProjectToken, body.Path)

	err := os.WriteFile(fullFilePath, []byte(""), 0644)
	if err != nil {
		log.Println(err)

		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create directory"})
	}

	return c.JSON(fiber.Map{"error": false})
}

func SaveRepositoryFile(c fiber.Ctx, db *sql.DB) error {

	body := new(models.SaveFileRequest)

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}

	RepoPath := os.Getenv("PROJECTS_FOLDER_PATH")

	fullFilePath := fmt.Sprintf("%s/%s/%s", RepoPath, body.ProjectToken, body.Path)
	err := lib.SaveFile(fullFilePath, body.Content)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete file"})
	}

	return c.JSON(fiber.Map{"error": false})
}

func DeleteFile(c fiber.Ctx, db *sql.DB) error {
	body := new(models.DeleteFileRequest)

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}
	RepoPath := os.Getenv("PROJECTS_FOLDER_PATH")
	fullFilePath := fmt.Sprintf("%s/%s/%s", RepoPath, body.ProjectToken, body.Path)
	err := os.Remove(fullFilePath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete file"})
	}
	return c.JSON(fiber.Map{"error": false})
}
