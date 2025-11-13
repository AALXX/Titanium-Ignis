package lib

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

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
func GetDirectoryStructureFromGit(gitDir, ref, dirPath string) ([]models.FileNode, error) {
	var nodes []models.FileNode
	
	var treeRef string
	if dirPath == "" || dirPath == "." {
		treeRef = ref
	} else {
		treeRef = ref + ":" + dirPath
	}
	
	cmd := exec.Command("git", "--git-dir="+gitDir, "ls-tree", treeRef)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("git ls-tree failed for %s: %w", treeRef, err)
	}
	
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")

	for _, line := range lines {
		if line == "" {
			continue
		}

		node, err := parseGitLsTreeLine(line, dirPath)
		if err != nil {
			fmt.Printf("DEBUG: Failed to parse line: %s\n", line)
			continue 
		}
		
		if node.IsDir {
			children, err := GetDirectoryStructureFromGit(gitDir, ref, node.Path)
			if err == nil {
				node.Children = children
			} else {
				fmt.Printf("DEBUG: Failed to get children for %s: %v\n", node.Path, err)
			}
		}

		nodes = append(nodes, node)
	}

	return nodes, nil
}

func parseGitLsTreeLine(line string, parentPath string) (models.FileNode, error) {
	// Format: <mode> SP <type> SP <object> TAB <file>
	parts := strings.Split(line, "\t")
	if len(parts) != 2 {
		return models.FileNode{}, fmt.Errorf("invalid format")
	}

	metadata := strings.Fields(parts[0])
	if len(metadata) < 3 {
		return models.FileNode{}, fmt.Errorf("invalid metadata")
	}

	objType := metadata[1]
	fileName := parts[1]

	isDir := objType == "tree"

	var fullPath string
	if parentPath == "" || parentPath == "." {
		fullPath = fileName
	} else {
		fullPath = parentPath + "/" + fileName
	}

	node := models.FileNode{
		UUID:     uuid.New().String(),
		Name:     fileName,
		Path:     fullPath,
		IsDir:    isDir,
		IsNew:    false,
		Children: []models.FileNode{},
	}

	return node, nil
}

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
	log.Printf("[DEBUG] CheckPermissions called with: userSessionToken=%s, projectToken=%s, resource=%s, action=%s", 
		userSessionToken, projectToken, resource, action)
	
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
	
	if err != nil {
		log.Printf("[ERROR] Query execution failed: %v", err)
		return false
	}

	defer rows.Close()

	var hasPermission bool
	var userLevel int
	var roleName string
	var roleDisplayName string
	var directPermission sql.NullString
	var userPermission sql.NullString
	var inheritedPermission sql.NullString

	rowCount := 0
	for rows.Next() {
		rowCount++
		err := rows.Scan(&hasPermission, &userLevel, &roleName, &roleDisplayName, &directPermission, &userPermission, &inheritedPermission)
		if err != nil {
			log.Printf("[ERROR] Row scan failed on row %d: %v", rowCount, err)
			return false
		}

		log.Printf("[DEBUG] Row %d: hasPermission=%v, userLevel=%d, roleName=%s, roleDisplayName=%s, directPermission=%v, userPermission=%v, inheritedPermission=%v",
			rowCount, hasPermission, userLevel, roleName, roleDisplayName, 
			directPermission.String, userPermission.String, inheritedPermission.String)

		if hasPermission {
			log.Printf("[INFO] Permission GRANTED for user %s on project %s for resource=%s, action=%s (via role: %s)",
				userPrivateToken, projectToken, resource, action, roleName)
			return true
		}
	}

	if err = rows.Err(); err != nil {
		log.Printf("[ERROR] Row iteration error: %v", err)
		return false
	}

	if rowCount == 0 {
		log.Printf("[INFO] No rows returned from permission query - user may not be a team member of this project")
	} else {
		log.Printf("[INFO] Permission DENIED for user %s on project %s for resource=%s, action=%s",
			userPrivateToken, projectToken, resource, action)
	}

	return false
}