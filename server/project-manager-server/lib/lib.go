package lib

import (
	"database/sql"
	"time"
	"fmt"
	"os"
	// "project-manager-server/models"
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
	rows, err := db.Query("SELECT UserPublicToken FROM users WHERE UserPrivateToken=?;", PrivateToken)
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

func GetAccountRating(PublicToken string, db *sql.DB) int {
	rows, err := db.Query("select Rating from users WHERE UserPublicToken=?;", PublicToken)
	if err != nil {
		return 0
	}
	defer rows.Close()

	var Rating int

	for rows.Next() {
		if err := rows.Scan(&Rating); err != nil {
			return 0
		}
	}

	if err := rows.Err(); err != nil {
		return 0
	}

	return Rating
}
