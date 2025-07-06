package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

var (
	cacheLock sync.RWMutex
	fileCache = make(map[string]cachedFile)
)

type cachedFile struct {
	content   []byte
	timestamp time.Time
}

func safeFileServer(requestedPath string, baseDir string) ([]byte, string, error) {
	if !strings.HasPrefix(requestedPath, baseDir) {
		return nil, "", fiber.ErrForbidden
	}

	cacheLock.RLock()
	cachedContent, exists := fileCache[requestedPath]
	cacheLock.RUnlock()

	if exists {
		fileInfo, err := os.Stat(requestedPath)
		if err == nil && fileInfo.ModTime().Before(cachedContent.timestamp) {
			return cachedContent.content, filepath.Ext(requestedPath), nil
		}
	}

	fileInfo, err := os.Stat(requestedPath)
	if os.IsNotExist(err) {
		// Try to find a default icon in the shared directory
		defaultIconPath := filepath.Join(os.Getenv("SHARED_ROOT_PATH"), "AccountIcon.svg")
		if defaultFile, err := os.ReadFile(defaultIconPath); err == nil {
			return defaultFile, ".svg", nil
		}
		// Fallback to embedded default or return error
		return nil, "", fiber.ErrNotFound
	}

	if fileInfo.IsDir() {
		return nil, "", fiber.ErrForbidden
	}

	content, err := os.ReadFile(requestedPath)
	if err != nil {
		return nil, "", fiber.ErrInternalServerError
	}

	cacheLock.Lock()
	fileCache[requestedPath] = cachedFile{content: content, timestamp: time.Now()}
	cacheLock.Unlock()

	return content, filepath.Ext(requestedPath), nil
}

func resetCache() {
	cacheLock.Lock()
	defer cacheLock.Unlock()
	fileCache = make(map[string]cachedFile)
}

func watchFiles(ctx context.Context, dir string) {
	// Check if directory exists before watching
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		log.Printf("Directory %s does not exist, skipping watch", dir)
		return
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Printf("Error creating watcher for %s: %v", dir, err)
		return
	}
	defer watcher.Close()

	err = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			log.Printf("Error walking path %s: %v", path, err)
			return err
		}
		if info.IsDir() {
			return watcher.Add(path)
		}
		return nil
	})
	if err != nil {
		log.Printf("Error setting up file watcher for %s: %v", dir, err)
		return
	}

	log.Printf("Started watching directory: %s", dir)

	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-watcher.Events:
			if !ok {
				return
			}
			if event.Op&fsnotify.Write == fsnotify.Write {
				log.Printf("File changed: %s, resetting cache", event.Name)
				resetCache()
			}
		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Printf("Watcher error: %v", err)
		}
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	// Try to load .env file, but don't fail if it doesn't exist
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: Could not load .env file: %v (continuing with environment variables)", err)
	}

	serverHost := getEnvOrDefault("SERVER_HOST", "0.0.0.0:5600")
	log.Printf("Server will listen on %s\n", serverHost)

	username := os.Getenv("AUTH_USERNAME")
	password := os.Getenv("AUTH_PASSWORD")

	if username == "" || password == "" {
		log.Println("Warning: AUTH_USERNAME and AUTH_PASSWORD not set, authentication disabled")
	}

	// Get all directory paths from environment variables
	accountsDir := filepath.Clean(getEnvOrDefault("ACCOUNTS_FOLDER_PATH", "/shared/accounts"))
	projectsDir := filepath.Clean(getEnvOrDefault("PROJECTS_FOLDER_PATH", "/shared/projects"))
	reposDir := filepath.Clean(getEnvOrDefault("REPOSITORIES_FOLDER_PATH", "/shared/repos"))
	deploymentsDir := filepath.Clean(getEnvOrDefault("PROJECT_DEPLOYMENT_FOLDER_PATH", "/shared/local-deployments"))
	messagesDir := filepath.Clean(getEnvOrDefault("MESSAGES_FOLDER_PATH", "/shared/messages"))
	tempDir := filepath.Clean(getEnvOrDefault("TEMP_FOLDER_PATH", "/shared/tmp"))

	log.Printf("Directory paths:")
	log.Printf("  Accounts: %s", accountsDir)
	log.Printf("  Projects: %s", projectsDir)
	log.Printf("  Repositories: %s", reposDir)
	log.Printf("  Deployments: %s", deploymentsDir)
	log.Printf("  Messages: %s", messagesDir)
	log.Printf("  Temp: %s", tempDir)

	// Verify directories exist
	dirs := map[string]string{
		"accounts":     accountsDir,
		"projects":     projectsDir,
		"repos":        reposDir,
		"deployments":  deploymentsDir,
		"messages":     messagesDir,
		"temp":         tempDir,
	}

	for name, dir := range dirs {
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			log.Printf("Warning: %s directory does not exist: %s", name, dir)
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start file watchers for all directories
	go watchFiles(ctx, accountsDir)
	go watchFiles(ctx, projectsDir)
	go watchFiles(ctx, reposDir)
	go watchFiles(ctx, deploymentsDir)
	go watchFiles(ctx, messagesDir)
	go watchFiles(ctx, tempDir)

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			log.Printf("Error: %v", err)
			return c.Status(code).SendString(err.Error())
		},
	})

	// Add middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":    "healthy",
			"timestamp": time.Now().Unix(),
		})
	})

	// File serving routes
	app.Get("/*", func(c *fiber.Ctx) error {
		path := c.Path()
		var baseDir string

		switch {
		case strings.HasPrefix(path, "/accounts/"):
			baseDir = accountsDir
			path = strings.TrimPrefix(path, "/accounts")
		case strings.HasPrefix(path, "/projects/"):
			baseDir = projectsDir
			path = strings.TrimPrefix(path, "/projects")
		case strings.HasPrefix(path, "/repos/"):
			baseDir = reposDir
			path = strings.TrimPrefix(path, "/repos")
		case strings.HasPrefix(path, "/deployments/"):
			baseDir = deploymentsDir
			path = strings.TrimPrefix(path, "/deployments")
		case strings.HasPrefix(path, "/messages/"):
			baseDir = messagesDir
			path = strings.TrimPrefix(path, "/messages")
		case strings.HasPrefix(path, "/temp/"):
			baseDir = tempDir
			path = strings.TrimPrefix(path, "/temp")
		default:
			return c.Status(fiber.StatusNotFound).SendString("Not Found")
		}

		// Clean and construct the requested path
		requestedPath := filepath.Join(baseDir, filepath.Clean(path))

		content, ext, err := safeFileServer(requestedPath, baseDir)
		if err != nil {
			return err
		}

		c.Type(ext)
		return c.Send(content)
	})

	log.Printf("Server is starting on %s\n", serverHost)
	if err := app.Listen(serverHost); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}