package services

import (
	"bytes"
	"database/sql"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"project-manager-server/lib"
	"project-manager-server/models"
	"strings"

	"github.com/gofiber/fiber/v3"
)

func GenerateRepository(c fiber.Ctx, db *sql.DB) error {
	body := new(models.GenerateRepositoryRequest)

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}

	projectPath := fmt.Sprintf("%s/%s", os.Getenv("PROJECTS_FOLDER_PATH"), body.ProjectToken)
	repoPath := fmt.Sprintf("%s/%s.git", os.Getenv("REPOSITORIES_FOLDER_PATH"), body.ProjectToken) // Ensure .git suffix

	// Convert to absolute paths
	absProjectPath, err := filepath.Abs(projectPath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get absolute project path"})
	}

	absRepoPath, err := filepath.Abs(repoPath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get absolute repo path"})
	}

	if _, err := os.Stat(absRepoPath); err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Repository already exists"})
	}

	// Add the project directory to safe.directory configuration
	cmd := exec.Command("git", "config", "--global", "--add", "safe.directory", absProjectPath)
	if out, err := cmd.CombinedOutput(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to configure safe.directory: %s", out),
		})
	}

	gitPath := fmt.Sprintf("%s/.git", absProjectPath)
	if _, err := os.Stat(gitPath); os.IsNotExist(err) {
		log.Println("Git repository does not exist. Initializing...")
		tmpDir, err := os.MkdirTemp("", "repo-init-*")
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create temporary directory"})
		}
		defer os.RemoveAll(tmpDir)

		cmd = exec.Command("git", "init", tmpDir)
		if out, err := cmd.CombinedOutput(); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to initialize repository: %s", out)})
		}

		if err := lib.CopyDir(absProjectPath, tmpDir); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to copy files: %s", err)})
		}

		cmd = exec.Command("git", "config", "user.email", os.Getenv("GIT_USER_EMAIL"))
		cmd.Dir = tmpDir
		if err := cmd.Run(); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error configuring git user email"})
		}

		cmd = exec.Command("git", "config", "user.name", os.Getenv("GIT_USER"))
		cmd.Dir = tmpDir
		if err := cmd.Run(); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error configuring git user name"})
		}

		cmd = exec.Command("git", "add", ".")
		cmd.Dir = tmpDir
		if err := cmd.Run(); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error adding files"})
		}

		cmd = exec.Command("git", "commit", "-m", "Initial commit")
		cmd.Dir = tmpDir
		if err := cmd.Run(); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error creating initial commit"})
		}

		cmd = exec.Command("git", "clone", "--bare", tmpDir, absRepoPath)
		if out, err := cmd.CombinedOutput(); err != nil {
			os.RemoveAll(absRepoPath)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to create bare repository: %s", out)})
		}
	} else {
		log.Println("Repository already exists, cloning...")

		if _, err := os.Stat(gitPath); os.IsNotExist(err) {
			cmd = exec.Command("git", "init")
			cmd.Dir = absProjectPath
			if out, err := cmd.CombinedOutput(); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": fmt.Sprintf("Failed to initialize repository: %s", out),
				})
			}

			// Configure Git user
			cmd = exec.Command("git", "config", "user.email", os.Getenv("GIT_USER_EMAIL"))
			cmd.Dir = absProjectPath
			if out, err := cmd.CombinedOutput(); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": fmt.Sprintf("Error configuring git user email: %s", out),
				})
			}

			cmd = exec.Command("git", "config", "user.name", os.Getenv("GIT_USER"))
			cmd.Dir = absProjectPath
			if out, err := cmd.CombinedOutput(); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": fmt.Sprintf("Error configuring git user name: %s", out),
				})
			}
		}

		cmd = exec.Command("git", "add", ".")
		cmd.Dir = absProjectPath
		if out, err := cmd.CombinedOutput(); err != nil {
			log.Printf("Error adding files: %s\n", out)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Error adding files: %s", out)})
		}

		cmd = exec.Command("git", "commit", "-m", "generate repository")
		cmd.Dir = absProjectPath
		if out, err := cmd.CombinedOutput(); err != nil {
			if !strings.Contains(string(out), "nothing to commit") {
				log.Printf("Error committing changes: %s\n", out)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": fmt.Sprintf("Error creating commit: %s", out),
				})
			}
			log.Println("Nothing to commit, continuing...")
		}

		cmd = exec.Command("git", "clone", "--bare", absProjectPath, absRepoPath)
		if out, err := cmd.CombinedOutput(); err != nil {
			os.RemoveAll(absRepoPath)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf("Failed to create bare repository: %s", out),
			})
		}
	}

	//update project repoUrl
	rows, err := db.Query("UPDATE projects_codebase SET RepositoryUrl = $1 WHERE ProjectToken = $2;", fmt.Sprintf("http://%s:5200/api/repositories/%s.git", os.Getenv("SERVER_HOST"), body.ProjectToken), body.ProjectToken)
	if err != nil {
		log.Println("Error updating project repoUrl in database:", err)
		return c.Status(500).SendString("Failed to update project repoUrl in database")
	}
	defer rows.Close()

	return c.JSON(fiber.Map{"error": false, "repoUrl": fmt.Sprintf("http://%s:5200/api/repositories/%s.git", os.Getenv("SERVER_HOST"), body.ProjectToken)})
}

func HandleInfoRefs(c fiber.Ctx) error {
	repoName := c.Params("repo")
	service := c.Query("service")

	if service != "git-upload-pack" && service != "git-receive-pack" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid service"})
	}

	repoPath := filepath.Join(os.Getenv("REPOSITORIES_FOLDER_PATH"), repoName)
	absPath, err := filepath.Abs(repoPath)
	if err != nil {
		log.Fatal(err)
	}

	if !strings.HasSuffix(absPath, ".git") {
		absPath += ".git"
	}

	log.Printf("Accessing repository at: %s", absPath)

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Repository not found"})
	}

	c.Set("Content-Type", fmt.Sprintf("application/x-%s-advertisement", service))
	c.Set("Cache-Control", "no-cache")

	// Write service header in Git's packet-line format
	serviceHeader := fmt.Sprintf("# service=%s\n", service)
	fmt.Fprintf(c, "%04x%s", len(serviceHeader)+4, serviceHeader)
	fmt.Fprintf(c, "0000")

	cmd := exec.Command("git", service[4:], "--stateless-rpc", "--advertise-refs", absPath)
	cmd.Dir = absPath

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create stdout pipe"})
	}

	if err := cmd.Start(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to start command"})
	}

	defer cmd.Wait()

	log.Printf("Running command: git %s --stateless-rpc --advertise-refs %s", service[4:], absPath)

	if _, err := io.Copy(c, stdout); err != nil {
		log.Printf("Error copying output: %v", err)
	}
	log.Printf("Successfully handled info/refs request for %s", repoName)
	return nil
}

func HandleRPC(c fiber.Ctx) error {
	repoName := c.Params("repo")
	rpcService := c.Query("service")

	if strings.Contains(c.Path(), "git-receive-pack") {
		rpcService = "git-receive-pack"
	} else if strings.Contains(c.Path(), "git-upload-pack") {
		rpcService = "git-upload-pack"
	}

	if rpcService == "" {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid service")
	}

	repoPath := filepath.Join(os.Getenv("REPOSITORIES_FOLDER_PATH"), repoName)
	absPath, err := filepath.Abs(repoPath)
	if err != nil {
		log.Fatal(err)
	}

	if !strings.HasSuffix(absPath, ".git") {
		absPath += ".git"
	}

	log.Printf("RPC service %s on repository: %s", rpcService, absPath)

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).SendString("Repository not found")
	}

	c.Set("Content-Type", fmt.Sprintf("application/x-%s-result", rpcService))
	c.Set("Cache-Control", "no-cache")

	// Remove the "git-" prefix from the service name
	service := rpcService[4:]
	cmd := exec.Command("git", service, "--stateless-rpc", absPath)
	cmd.Dir = absPath

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to create stdin pipe")
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to create stdout pipe")
	}

	if err := cmd.Start(); err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to start command")
	}

	log.Printf("Running command: git %s --stateless-rpc %s", service, absPath)

	go func() {
		defer stdin.Close()
		if _, err := io.Copy(stdin, c.Request().BodyStream()); err != nil {
			log.Printf("Error copying input: %v", err)
		}
	}()

	if _, err := io.Copy(c, stdout); err != nil {
		log.Printf("Error copying output: %v", err)
	}

	if err := cmd.Wait(); err != nil {
		log.Printf("Command error: %v", err)
	}

	log.Printf("Successfully handled RPC request for %s", repoName)

	// if is a git-upload service update the project folder
	// if rpcService == "git-upload-pack" {
	// 	ProjectPath := fmt.Sprintf("%s/%s", os.Getenv("PROJECTS_FOLDER_PATH"), repoName)
	// 	ProjectPath, err := filepath.Abs(ProjectPath)
	// 	if err != nil {
	// 		log.Fatal(err)
	// 	}

	return nil
}

func CreateRepo(c fiber.Ctx, db *sql.DB) error {
	body := new(models.CodebaseFormData)

	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cannot parse body"})
	}

	// Example permission check (uncomment when implemented)
	// userSessionToken := c.Params("UserSessionToken")
	// permission := lib.CheckPermissions(db, userSessionToken, body.ProjectToken, "code", "create")
	// if !permission {
	//     return c.Status(fiber.StatusForbidden).SendString("You don't have permission to create a repository")
	// }

	if body.Mode == "create" {
		if body.RepositoryName == nil {
			return c.Status(fiber.StatusBadRequest).SendString("repositoryName is required in create mode")
		}

		repoName := *body.RepositoryName

		repoPath := filepath.Join(os.Getenv("REPOSITORIES_FOLDER_PATH"), body.ProjectToken+".git")

		if _, err := os.Stat(repoPath); err == nil {
			log.Printf("Repository already exists: %s", repoPath)
			return c.Status(fiber.StatusConflict).SendString("Repository already exists")
		}

		if err := os.MkdirAll(repoPath, 0755); err != nil {
			log.Printf("Error creating repository directory: %v", err)
			return c.Status(fiber.StatusInternalServerError).SendString(err.Error())
		}

		cmd := exec.Command("git", "init", "--bare", repoPath)
		var stderr bytes.Buffer
		cmd.Stderr = &stderr

		if err := cmd.Run(); err != nil {
			os.RemoveAll(repoPath)
			log.Printf("Error initializing repository: %v\nStderr: %s", err, stderr.String())
			return c.Status(fiber.StatusInternalServerError).SendString(
				fmt.Sprintf("Error initializing repository: %s", stderr.String()),
			)
		}

		rows, err := db.Query(`
    INSERT INTO projects_codebase (
        ProjectToken, Mode, RepositoryName, Description, InitializeWithReadme,
        GitignoreTemplate, License, RepositoryUrl, ProjectType, Branch,
        AuthMethod, AccessToken, SshKey, Username, AutoSync, SyncInterval,
        LastUserCommitUserToken
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
`,
			body.ProjectToken,
			"create",
			body.RepositoryName,
			body.Description,
			body.InitializeWithReadme,
			body.GitignoreTemplate,
			body.License,
			fmt.Sprintf("http://%s:5200/api/repositories/%s.git", os.Getenv("SERVER_HOST"), body.ProjectToken),
			body.ProjectType,
			body.Branch,
			body.AuthMethod,
			body.AccessToken,
			body.SshKey,
			body.Username,
			body.AutoSync,
			body.SyncInterval,
			body.LastUserCommitUserToken,
		)
		if err != nil {
			log.Println("Error updating project repoUrl in database:", err)
			return c.Status(500).SendString("Failed to update project repoUrl in database")
		}
		defer rows.Close()

		log.Printf("Successfully created repository: %s", repoPath)
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message":      "Repository created successfully",
			"repoName":     repoName,
			"repoPath":     repoPath,
			"projectToken": body.ProjectToken,
		})
	}

	if body.Mode == "add" {
		if body.RepositoryUrl == nil || body.ProjectType == nil {
			return c.Status(fiber.StatusBadRequest).SendString("repositoryUrl and projectType are required in add mode")
		}

		sourceUrl := *body.RepositoryUrl
		projectToken := body.ProjectToken

		log.Printf("Adding existing repository: %s (%s)", sourceUrl, *body.ProjectType)

		// Extract repo name from URL
		repoName := strings.Split(sourceUrl, "/")[len(strings.Split(sourceUrl, "/"))-1]
		repoName = strings.Split(repoName, ".")[0]

		repoPath := filepath.Join(os.Getenv("REPOSITORIES_FOLDER_PATH"), projectToken+".git")

		if _, err := os.Stat(repoPath); err == nil {
			log.Printf("Repository already exists: %s", repoPath)
			return c.Status(fiber.StatusConflict).SendString("Repository already exists on this server")
		}

		parentDir := filepath.Dir(repoPath)
		if err := os.MkdirAll(parentDir, 0755); err != nil {
			log.Printf("Error creating repository directory: %v", err)
			return c.Status(fiber.StatusInternalServerError).SendString(fmt.Sprintf("Error creating directory: %v", err))
		}

		cloneCmd := exec.Command("git", "clone", "--mirror", sourceUrl, repoPath)

		env := os.Environ()
		if body.AccessToken != nil && *body.AccessToken != "" {
			sourceUrl = strings.Replace(sourceUrl, "https://", fmt.Sprintf("https://oauth2:%s@", *body.AccessToken), 1)
			cloneCmd.Args[3] = sourceUrl
		}
		if body.SshKey != nil && *body.SshKey != "" {
			env = append(env, fmt.Sprintf("GIT_SSH_COMMAND=ssh -i %s -o StrictHostKeyChecking=no", *body.SshKey))
		}
		cloneCmd.Env = env

		var cloneStderr bytes.Buffer
		cloneCmd.Stderr = &cloneStderr

		log.Printf("Cloning repository from: %s to: %s", sourceUrl, repoPath)

		if err := cloneCmd.Run(); err != nil {
			os.RemoveAll(repoPath)
			log.Printf("Error cloning repository: %v\nStderr: %s", err, cloneStderr.String())
			return c.Status(fiber.StatusInternalServerError).SendString(
				fmt.Sprintf("Error cloning repository: %s", cloneStderr.String()),
			)
		}

		ourRepoUrl := fmt.Sprintf("http://%s:5200/api/repositories/%s.git", os.Getenv("SERVER_HOST"), projectToken)

		_, err := db.Exec(`
    INSERT INTO projects_codebase (
        ProjectToken, Mode, RepositoryName, Description,
        RepositoryUrl, ProjectType, Branch,
        AuthMethod, AccessToken, SshKey, Username,
        AutoSync, SyncInterval, LastUserCommitUserToken
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
`,
			projectToken,
			"add",
			repoName,
			body.Description,
			ourRepoUrl,
			body.ProjectType,
			body.Branch,
			body.AuthMethod,
			body.AccessToken,
			body.SshKey,
			body.Username,
			body.AutoSync,
			body.SyncInterval,
			body.LastUserCommitUserToken,
		)

		if err != nil {
			os.RemoveAll(repoPath)
			log.Printf("Error inserting repository into database: %v", err)
			return c.Status(fiber.StatusInternalServerError).SendString("Failed to save repository to database")
		}

		log.Printf("Successfully added repository: %s", repoPath)
		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message":          "Repository added successfully",
			"projectToken":     projectToken,
			"sourceUrl":        sourceUrl,
			"ourRepositoryUrl": ourRepoUrl,
			"repoPath":         repoPath,
		})
	}

	return c.Status(fiber.StatusBadRequest).SendString("Invalid mode")
}