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

type Config struct {
	ServerHost          string
	Username            string
	Password            string
	SharedDataDir       string
	AccountsDir         string
	MessagesDir         string
	ProjectsDir         string
	ReposDir            string
	ProjectsFinancesDir string
}

type Cache struct {
	mu    sync.RWMutex
	files map[string]cachedFile
}

type cachedFile struct {
	content   []byte
	timestamp time.Time
}

func NewCache() *Cache {
	return &Cache{
		files: make(map[string]cachedFile),
	}
}

func (c *Cache) Get(path string) ([]byte, time.Time, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	cached, exists := c.files[path]
	return cached.content, cached.timestamp, exists
}

func (c *Cache) Set(path string, content []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.files[path] = cachedFile{
		content:   content,
		timestamp: time.Now(),
	}
}

func (c *Cache) Reset() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.files = make(map[string]cachedFile)
}

type FileServer struct {
	cache       *Cache
	defaultFile []byte
	defaultExt  string
}

func NewFileServer(cache *Cache, defaultFilePath string) (*FileServer, error) {
	fs := &FileServer{
		cache:      cache,
		defaultExt: ".svg",
	}

	if defaultFilePath != "" {
		content, err := os.ReadFile(defaultFilePath)
		if err == nil {
			fs.defaultFile = content
		} else {
			log.Printf("Warning: Could not load default file %s: %v", defaultFilePath, err)
		}
	}

	return fs, nil
}

func (fs *FileServer) ServeFile(requestedPath string, baseDir string) ([]byte, string, error) {
	if !strings.HasPrefix(requestedPath, baseDir) {
		return nil, "", fiber.ErrForbidden
	}

	cachedContent, cachedTime, exists := fs.cache.Get(requestedPath)
	if exists {
		fileInfo, err := os.Stat(requestedPath)
		if err == nil && fileInfo.ModTime().Before(cachedTime) {
			return cachedContent, filepath.Ext(requestedPath), nil
		}
	}

	fileInfo, err := os.Stat(requestedPath)
	if os.IsNotExist(err) {
		if fs.defaultFile != nil {
			return fs.defaultFile, fs.defaultExt, nil
		}
		return nil, "", fiber.ErrNotFound
	}
	if err != nil {
		return nil, "", fiber.ErrInternalServerError
	}

	if fileInfo.IsDir() {
		return nil, "", fiber.ErrForbidden
	}

	content, err := os.ReadFile(requestedPath)
	if err != nil {
		return nil, "", fiber.ErrInternalServerError
	}

	fs.cache.Set(requestedPath, content)

	return content, filepath.Ext(requestedPath), nil
}

type FileWatcher struct {
	cache *Cache
}

func NewFileWatcher(cache *Cache) *FileWatcher {
	return &FileWatcher{cache: cache}
}

func (fw *FileWatcher) Watch(ctx context.Context, dirs ...string) error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	defer watcher.Close()

	for _, dir := range dirs {
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			log.Printf("Warning: Directory %s does not exist, skipping watch", dir)
			continue
		}

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
			log.Printf("Warning: Could not watch directory %s: %v", dir, err)
		}
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case event, ok := <-watcher.Events:
			if !ok {
				return nil
			}
			if event.Op&fsnotify.Write == fsnotify.Write {
				fw.cache.Reset()
			}
		case err, ok := <-watcher.Errors:
			if !ok {
				return nil
			}
			log.Println("Watcher error:", err)
		}
	}
}

func loadConfig() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	} else {
		log.Println("Loaded environment from .env file")
	}

	username := os.Getenv("AUTH_USERNAME")
	password := os.Getenv("AUTH_PASSWORD")
	if username == "" || password == "" {
		log.Fatal("AUTH_USERNAME and AUTH_PASSWORD must be set")
	}

	serverHost := os.Getenv("SERVER_HOST")
	if serverHost == "" {
		serverHost = "0.0.0.0:5600"
	}

	sharedDataDir := os.Getenv("SHARED_DATA_DIR")
	if sharedDataDir == "" {
		if _, err := os.Stat("/shared_data"); err == nil {
			sharedDataDir = "/shared_data"
		} else {
			// cwd, _ := os.Getwd()
			sharedDataDir = filepath.Join("../data")
		}
	}

	config := &Config{
		ServerHost:          serverHost,
		Username:            username,
		Password:            password,
		SharedDataDir:       sharedDataDir,
		AccountsDir:         filepath.Join(sharedDataDir, "accounts"),
		MessagesDir:         filepath.Join(sharedDataDir, "messages"),
		ProjectsDir:         filepath.Join(sharedDataDir, "projects"),
		ReposDir:            filepath.Join(sharedDataDir, "repos"),
		ProjectsFinancesDir: filepath.Join(sharedDataDir, "projects/finances"),
	}

	log.Printf("Server will listen on %s", config.ServerHost)
	log.Printf("Data directory: %s", config.SharedDataDir)
	log.Printf("Auth username: %s", config.Username)

	// Log database config if set
	if dbHost := os.Getenv("POSTGRESQL_HOST"); dbHost != "" {
		log.Printf("Database config - Host: %s, Port: %s, User: %s, DB: %s",
			dbHost,
			os.Getenv("POSTGRESQL_PORT"),
			os.Getenv("POSTGRESQL_USER"),
			os.Getenv("POSTGRESQL_DB"))
	}

	return config, nil
}

func ensureDirectories(dirs ...string) error {
	for _, dir := range dirs {
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			log.Printf("Creating directory: %s", dir)
			if err := os.MkdirAll(dir, 0755); err != nil {
				return err
			}
		}
	}
	return nil
}

func setupRoutes(app *fiber.App, fileServer *FileServer, config *Config) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	app.Get("/*", func(c *fiber.Ctx) error {
		path := c.Path()

		routes := map[string]string{
			"/accounts/": config.AccountsDir,
			"/messages/": config.MessagesDir,
			"/projects/": config.ProjectsDir,
		}

		var baseDir, prefix string
		for p, dir := range routes {
			if strings.HasPrefix(path, p) {
				baseDir = dir
				prefix = p
				break
			}
		}

		if baseDir == "" {
			return c.Status(fiber.StatusNotFound).SendString("Not Found")
		}

		relativePath := strings.TrimPrefix(path, prefix)
		requestedPath := filepath.Join(baseDir, filepath.Clean(relativePath))

		content, ext, err := fileServer.ServeFile(requestedPath, baseDir)
		if err != nil {
			return err
		}

		c.Type(ext)
		return c.Send(content)
	})
}

func main() {
	config, err := loadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if err := ensureDirectories(config.AccountsDir, config.MessagesDir, config.ProjectsDir, config.ReposDir, config.ProjectsFinancesDir); err != nil {
		log.Fatalf("Failed to create directories: %v", err)
	}

	cache := NewCache()

	fileServer, err := NewFileServer(cache, "./AccountIcon.svg")
	if err != nil {
		log.Fatalf("Failed to initialize file server: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	watcher := NewFileWatcher(cache)
	go func() {
		if err := watcher.Watch(ctx, config.AccountsDir, config.MessagesDir); err != nil {
			log.Printf("Watcher stopped: %v", err)
		}
	}()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).SendString(err.Error())
		},
	})

	setupRoutes(app, fileServer, config)

	log.Printf("Server starting on %s", config.ServerHost)
	if err := app.Listen(config.ServerHost); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
