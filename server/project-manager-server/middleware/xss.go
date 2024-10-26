package middleware

import (
	"encoding/json"
	"github.com/gofiber/fiber/v3"
	"github.com/microcosm-cc/bluemonday"
)

// XSSConfig defines the config for XSS middleware
type XSSConfig struct {
	// Skip these paths from XSS sanitization
	SkipPaths []string
	// Use strict policy (default: true)
	StrictPolicy bool
}

// ConfigDefault is the default config
var ConfigDefault = XSSConfig{
	SkipPaths:    []string{},
	StrictPolicy: true,
}

// XSSMiddleware creates a middleware that sanitizes all input data
func XSSMiddleware(config ...XSSConfig) fiber.Handler {
	// Set default config
	cfg := ConfigDefault
	if len(config) > 0 {
		cfg = config[0]
	}

	// Create policy
	var policy *bluemonday.Policy
	if cfg.StrictPolicy {
		policy = bluemonday.StrictPolicy()
	} else {
		policy = bluemonday.UGCPolicy()
	}

	return func(c fiber.Ctx) error {
		// Skip if path is in SkipPaths
		for _, path := range cfg.SkipPaths {
			if c.Path() == path {
				return c.Next()
			}
		}

		// Handle JSON requests
		if c.Is("json") {
			var body interface{}
			if err := json.Unmarshal(c.Body(), &body); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid JSON",
				})
			}

			// Sanitize the body recursively
			sanitized := sanitizeData(body, policy)

			// Set the sanitized body back to the context
			if sanitizedJSON, err := json.Marshal(sanitized); err == nil {
				c.Request().SetBody(sanitizedJSON)
			}
		}

		return c.Next()
	}
}

// sanitizeData recursively sanitizes data using bluemonday
func sanitizeData(data interface{}, policy *bluemonday.Policy) interface{} {
	switch v := data.(type) {
	case string:
		return policy.Sanitize(v)
	case map[string]interface{}:
		sanitized := make(map[string]interface{})
		for key, value := range v {
			sanitized[key] = sanitizeData(value, policy)
		}
		return sanitized
	case []interface{}:
		sanitized := make([]interface{}, len(v))
		for i, value := range v {
			sanitized[i] = sanitizeData(value, policy)
		}
		return sanitized
	default:
		return v
	}
}