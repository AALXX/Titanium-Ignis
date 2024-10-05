package main

import (
	"context"
	"database/sql"
	"file-server/config"
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

func safeFileServer(dir string, db *sql.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Method() != fiber.MethodGet {
			return c.Status(fiber.StatusMethodNotAllowed).SendString("Method not allowed")
		}

		requestedPath := filepath.Join(dir, filepath.Clean(c.Path()))

		if !strings.HasPrefix(requestedPath, dir) {
			return c.Status(fiber.StatusForbidden).SendString("Access Denied")
		}

		cacheLock.RLock()
		cachedContent, exists := fileCache[requestedPath]
		cacheLock.RUnlock()

		if exists {
			fileInfo, err := os.Stat(requestedPath)
			if err == nil && fileInfo.ModTime().Before(cachedContent.timestamp) {
				c.Type(filepath.Ext(requestedPath))
				return c.Send(cachedContent.content)
			}
		}

		fileInfo, err := os.Stat(requestedPath)
		if os.IsNotExist(err) {
			return c.SendFile("./AccountIcon.svg")
		}

		if fileInfo.IsDir() {
			return c.Status(fiber.StatusForbidden).SendString("Not a File")
		}

		content, err := os.ReadFile(requestedPath)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString("Internal Server Error")
		}

		cacheLock.Lock()
		fileCache[requestedPath] = cachedFile{content: content, timestamp: time.Now()}
		cacheLock.Unlock()

		c.Type(filepath.Ext(requestedPath))
		return c.Send(content)
	}
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
		return watcher.Add(path)
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

	serverHost := "0.0.0.0:5600" // Default to all interfaces on port 5600
	log.Printf("Server will listen on %s\n", serverHost)

	username := os.Getenv("AUTH_USERNAME")
	password := os.Getenv("AUTH_PASSWORD")

	if username == "" || password == "" {
		log.Fatalf("AUTH_USERNAME and AUTH_PASSWORD must be set")
	}

	db, err := config.InitDB()
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	dir := "../accounts"

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go watchFiles(ctx, dir)

	app := fiber.New()

	// Basic auth middleware
	// app.Use(basicauth.New(basicauth.Config{
	// 	Users: map[string]string{
	// 		username: password,
	// 	},
	// 	Realm: "Restricted",
	// 	Authorizer: func(user, pass string) bool {
	// 		if subtle.ConstantTimeCompare([]byte(user), []byte(username)) == 1 {
	// 			// return bcrypt.CompareHashAndPassword([]byte(password), []byte(pass)) == nil
	// 			return pass == password
	// 		}
	// 		return false
	// 	},
	// }))

	app.Get("/*", safeFileServer(dir, db))

	log.Printf("Server is attempting to listen on %s\n", serverHost)
	if err := app.Listen(serverHost); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}