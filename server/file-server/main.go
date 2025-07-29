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
		defaultFile, _ := os.ReadFile("./AccountIcon.svg")
		return defaultFile, ".svg", nil
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
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal(err)
	}
	defer watcher.Close()

	err = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return watcher.Add(path)
		}
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}

	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-watcher.Events:
			if !ok {
				return
			}
			if event.Op&fsnotify.Write == fsnotify.Write {
				resetCache()
			}
		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Println("Error:", err)
		}
	}
}

func loadEnvFile() {
	// Try to load .env file if it exists, but don't fail if it doesn't
	// This allows for both .env file and environment variable usage
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	} else {
		log.Println("Loaded environment from .env file")
	}
}

func main() {
	loadEnvFile()

	serverHost := os.Getenv("SERVER_HOST")
	if serverHost == "" {
		serverHost = "0.0.0.0:5600"
	}
	log.Printf("Server will listen on %s\n", serverHost)

	// Database configuration (if needed for future use)
	dbHost := os.Getenv("POSTGRESQL_HOST")
	dbPort := os.Getenv("POSTGRESQL_PORT")
	dbUser := os.Getenv("POSTGRESQL_USER")
	// dbPass := os.Getenv("POSTGRESQL_PASS")
	dbName := os.Getenv("POSTGRESQL_DB")
	
	if dbHost != "" {
		log.Printf("Database config - Host: %s, Port: %s, User: %s, DB: %s", dbHost, dbPort, dbUser, dbName)
	}

	// Authentication
	username := os.Getenv("AUTH_USERNAME")
	password := os.Getenv("AUTH_PASSWORD")

	if username == "" || password == "" {
		log.Fatalf("AUTH_USERNAME and AUTH_PASSWORD must be set")
	}

	log.Printf("Environment loaded - AUTH_USERNAME: %s", username)

	// Use shared volume paths for containers
	sharedDataDir := "/shared_data"
	accountsDir := filepath.Join(sharedDataDir, "accounts")
	messagesDir := filepath.Join(sharedDataDir, "messages")
	projectsDir := filepath.Join(sharedDataDir, "projects")

	// Create all necessary directories in shared volume
	directories := []string{accountsDir, messagesDir, projectsDir}
	for _, dir := range directories {
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			log.Printf("Creating directory: %s", dir)
			if err := os.MkdirAll(dir, 0755); err != nil {
				log.Printf("Warning: Failed to create directory %s: %v", dir, err)
			}
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go watchFiles(ctx, accountsDir)
	go watchFiles(ctx, messagesDir)
	app := fiber.New()

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	app.Get("/*", func(c *fiber.Ctx) error {
		path := c.Path()
		var baseDir string

		if strings.HasPrefix(path, "/accounts/") {
			baseDir = accountsDir
		} else if strings.HasPrefix(path, "/messages/") {
			baseDir = messagesDir
		} else if strings.HasPrefix(path, "/projects/") {
			baseDir = projectsDir
		} else {
			return c.Status(fiber.StatusNotFound).SendString("Not Found")
		}

		// Clean path - remove the prefix to get relative path
		var relativePath string
		if strings.HasPrefix(path, "/accounts/") {
			relativePath = strings.TrimPrefix(path, "/accounts")
		} else if strings.HasPrefix(path, "/messages/") {
			relativePath = strings.TrimPrefix(path, "/messages")
		} else if strings.HasPrefix(path, "/projects/") {
			relativePath = strings.TrimPrefix(path, "/projects")
		}
		
		requestedPath := filepath.Join(baseDir, filepath.Clean(relativePath))

		content, ext, err := safeFileServer(requestedPath, baseDir)
		if err != nil {
			return err
		}

		c.Type(ext)
		return c.Send(content)
	})

	log.Printf("Server is attempting to listen on %s\n", serverHost)
	if err := app.Listen(serverHost); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}