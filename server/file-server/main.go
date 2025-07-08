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

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	wd, _ := os.Getwd()
	log.Println("Current Working Directory:", wd)
	
	serverHost := "0.0.0.0:5600"
	log.Printf("Server will listen on %s\n", serverHost)

	username := os.Getenv("AUTH_USERNAME")
	password := os.Getenv("AUTH_PASSWORD")

	if username == "" || password == "" {
		log.Fatalf("AUTH_USERNAME and AUTH_PASSWORD must be set")
	}

	accountsDir := filepath.Clean("../accounts")
	messagesDir := filepath.Clean("../messages")

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
		} else {
			return c.Status(fiber.StatusNotFound).SendString("Not Found")
		}

		// Clean path
		relativePath := strings.TrimPrefix(path, "/accounts")
		relativePath = strings.TrimPrefix(relativePath, "/messages")
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
