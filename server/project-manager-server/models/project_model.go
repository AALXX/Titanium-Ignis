package models

import (
	"time"
)

type ProjectRequest struct {
	Project_name string `json:"ProjectName"`
	Repo_url     string `json:"RepoUrl"`
	SessionToken string `json:"UserSessionToken"`
	Type         string `json:"Type"`
}

type Project struct {
	ID             int       `json:"id"`
	Project_name   string    `json:"project_name"`
	Project_token  string    `json:"project_token"`
	Repo_url       string    `json:"repo_url"`
	Checked_out_by string    `json:"checked_out_by"`
	Checked_out_at time.Time `json:"checked_out_at"`
	Status         string    `json:"status"`
	Type           string    `json:"type"`
}

type ProjectResponse struct {
	ID             int    `json:"id"`
	Project_name   string `json:"ProjectName"`
	Project_token  string `json:"ProjectToken"`
	Repo_url       string `json:"RepoUrl"`
	Checked_out_by string `json:"CheckedOutBy"`
	Status         string `json:"Status"`
	Type           string `json:"Type"`
}

type ProjectService struct {
	ID             int               `json:"id"`
	Name           string            `json:"name"`
	Dir            string            `json:"dir"`
	StartCommand   string            `json:"start-command"`
}


type ProjectConfig struct {
	Services []ProjectService `json:"services"`
}

type FileNode struct {
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	IsDir    bool       `json:"is_dir"`
	Children []FileNode `json:"children,omitempty"`
}

type SaveFileRequest struct {
	ProjectToken     string `json:"projectToken"`
	UserSessionToken string `json:"userSessionToken"`
	Path             string `json:"path"`
	Content          string `json:"content"`
}

type CreateNewFileRequest struct {
	ProjectToken     string `json:"projectToken"`
	UserSessionToken string `json:"userSessionToken"`
	Path             string `json:"path"`
}

type DeleteFileRequest struct {
	ProjectToken     string `json:"projectToken"`
	UserSessionToken string `json:"userSessionToken"`
	Path             string `json:"path"`
}