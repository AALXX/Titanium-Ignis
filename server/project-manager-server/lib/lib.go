package lib

import (
	"database/sql"
	"fmt"
	"io"
	"log"
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

func GetPrivateTokenBySessionToken(sessionToken string, db *sql.DB) string {
	const query = `
		SELECT u.UserPrivateToken
		FROM account_sessions s
		INNER JOIN users u ON s.userID = u.id
		WHERE s.userSessionToken = $1
		LIMIT 1;
	`

	row := db.QueryRow(query, sessionToken)

	var userPrivateToken string
	if err := row.Scan(&userPrivateToken); err != nil {
		return "error"
	}

	return userPrivateToken
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

// Function to copy directory recursively
func CopyDir(src string, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Get relative path
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			// Create directory
			return os.MkdirAll(dstPath, info.Mode())
		} else {
			// Copy file
			srcFile, err := os.Open(path)
			if err != nil {
				return err
			}
			defer srcFile.Close()

			dstFile, err := os.Create(dstPath)
			if err != nil {
				return err
			}
			defer dstFile.Close()

			_, err = io.Copy(dstFile, srcFile)
			if err != nil {
				return err
			}

			return os.Chmod(dstPath, info.Mode())
		}
	})
}

func CheckPermissions(db *sql.DB, userSessionToken string, projectToken string, resource string, action string) bool {
	userPrivateToken := GetPrivateTokenBySessionToken(userSessionToken, db)

	if userPrivateToken == "" {
		return false
	}

	permissionQuery := `WITH user_roles AS (
                    SELECT DISTINCT r.id, r.level, r.name, r.display_name
                    FROM projects_team_members ptm
                    JOIN roles r ON r.id = ptm.role_id
                    WHERE ptm.userprivatetoken = $1
                    AND ptm.projecttoken = $2
                    AND ptm.is_active = true
                    ORDER BY r.level DESC
                    LIMIT 1
                ),
                required_permission AS (
                    SELECT p.id as permission_id, p.name as permission_name
                    FROM permissions p
                    JOIN resources res ON res.id = p.resource_id
                    JOIN actions a ON a.id = p.action_id
                    WHERE res.name = $3
                    AND a.name = $4
                ),
                user_permissions AS (
                    SELECT DISTINCT p.id as permission_id, p.name as permission_name
                    FROM user_roles ur
                    JOIN role_permissions rp ON rp.role_id = ur.id
                    JOIN permissions p ON p.id = rp.permission_id
                    JOIN resources res ON res.id = p.resource_id
                    JOIN actions a ON a.id = p.action_id
                    WHERE res.name = $3
                    AND a.name = $4
                ),
                role_hierarchy_permissions AS (
                    SELECT DISTINCT p.id as permission_id, p.name as permission_name
                    FROM user_roles ur
                    JOIN role_inheritance ri ON ri.child_role_id = ur.id
                    JOIN role_permissions rp ON rp.role_id = ri.parent_role_id
                    JOIN permissions p ON p.id = rp.permission_id
                    JOIN resources res ON res.id = p.resource_id
                    JOIN actions a ON a.id = p.action_id
                    WHERE res.name = $3
                    AND a.name = $4
                )
                SELECT 
                    CASE 
                        WHEN ur.name = 'PROJECT_OWNER' THEN true
                        WHEN ur.name = 'GUEST' AND $4 != 'read' THEN false
                        WHEN rp.permission_id IS NOT NULL THEN true
                        WHEN up.permission_id IS NOT NULL THEN true
                        WHEN rhp.permission_id IS NOT NULL THEN true
                        ELSE false
                    END as has_permission,
                    ur.level as user_level,
                    ur.name as role_name,
                    ur.display_name as role_display_name,
                    rp.permission_name as direct_permission,
                    up.permission_name as user_permission,
                    rhp.permission_name as inherited_permission
                FROM user_roles ur
                LEFT JOIN required_permission rp ON true
                LEFT JOIN user_permissions up ON up.permission_id = rp.permission_id
                LEFT JOIN role_hierarchy_permissions rhp ON rhp.permission_id = rp.permission_id;
            `

	rows, err := db.Query(permissionQuery, userPrivateToken, projectToken, resource, action)
	log.Println("Permission Result: ", rows, err)

	if err != nil {
		return false
	}

	defer rows.Close()

	var hasPermission bool
	var userLevel int
	var roleName string
	var roleDisplayName string
	var directPermission string
	var userPermission string
	var inheritedPermission string

	for rows.Next() {
		err := rows.Scan(&hasPermission, &userLevel, &roleName, &roleDisplayName, &directPermission, &userPermission, &inheritedPermission)
		if err != nil {
			return false
		}

		if hasPermission {
			return true
		}
	}

	return false
}
