package lib

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"

	"project-manager-server/models"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
)

func CreateToken() string {

	// Generate the secret extension based on the current timestamp
	secretExt := time.Now().Unix()

	// Get the secret key from environment variable and append the timestamp
	jwtSecretKey := fmt.Sprintf("%s%d", os.Getenv("ACCOUNT_SECRET"), secretExt)

	token := jwt.New(jwt.SigningMethodHS256)

	// Sign the token using the secret key
	tokenString, err := token.SignedString([]byte(jwtSecretKey))
	if err != nil {
		return ""
	}

	return tokenString
}

func GetPublicTokenByPrivateToken(PrivateToken string, db *sql.DB) string {
	rows, err := db.Query("SELECT UserPublicToken FROM users WHERE UserPrivateToken=$1;", PrivateToken)
	if err != nil {
		return "error"
	}
	defer rows.Close()

	var userPublicToken string

	for rows.Next() {
		if err := rows.Scan(&userPublicToken); err != nil {
			return "error"
		}
	}

	if err := rows.Err(); err != nil {
		return "error"
	}

	return userPublicToken
}

func GetPrivateTokenBySessionToken(SessionToken string, db *sql.DB) string {
	rows, err := db.Query("SELECT UserPrivateToken FROM users WHERE UserSessionToken=$1;", SessionToken)
	if err != nil {
		return "error"
	}
	defer rows.Close()
	var UserPrivateToken string
	for rows.Next() {
		if err := rows.Scan(&UserPrivateToken); err != nil {
			return "error"
		}
	}
	if err := rows.Err(); err != nil {
		return "error"
	}
	return UserPrivateToken
}



///////////////////////////////////
//		Projects Related		//
//////////////////////////////////

func GetDirectoryStructure(basePath string) ([]models.FileNode, error) {
	var nodes []models.FileNode

	files, err := os.ReadDir(basePath)
	if err != nil {
		return nil, err
	}

	for _, file := range files {
		node := models.FileNode{
			UUID:  uuid.New().String(),
			Name:  file.Name(),
			Path:  filepath.Join(basePath, file.Name()),
			IsDir: file.IsDir(),
			IsNew: false,
		}

		if file.IsDir() {
			children, err := GetDirectoryStructure(filepath.Join(basePath, file.Name()))
			if err != nil {
				return nil, err
			}
			node.Children = children
		}

		nodes = append(nodes, node)
	}

	return nodes, nil
}

// Get file contents based on file path
func GetFileContents(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func SaveFile(filePath string, content string) error {
	err := os.WriteFile(filePath, []byte(content), 0644)
	if err != nil {
		return err
	}
	return nil
}