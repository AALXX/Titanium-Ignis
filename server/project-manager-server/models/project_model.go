package models

import (
	"time"
)

type AddProjectRequest struct {
	Project_name string `json:"ProjectName"`
	Repo_url     string `json:"RepoUrl"`
	SessionToken string `json:"UserSessionToken"`
	Type         string `json:"Type"`
}

// write this in golang
type TeamMember struct {
	Email string
	Role string
}

type CreateProjectRequest struct {
	Project_name        string       `json:"ProjectName"`
	Project_description string       `json:"ProjectDescription"`
	Team_members        []TeamMember `json:"TeamMembers"`
	Repo_type           string       `json:"RepoType"`
	SessionToken        string       `json:"UserSessionToken"`
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

type SetupCommand struct {
	Run string `json:"run"`
}

type ProjectService struct {
	ID           int                       `json:"id"`
	Name         string                    `json:"name"`
	Dir          string                    `json:"dir"`
	Setup        *[]SetupCommand           `json:"setup,omitempty"`
	StartCommand string                    `json:"start-command"`
	Ports        *map[string][]string      `json:"ports,omitempty"`
}

type ProjectDeployment struct {
	ID                int    `json:"id"`
	Name              string `json:"name"`
	Type              string `json:"type"`
	Server            string `json:"server"`
	DockerComposeFile *string `json:"docker-compose-file,omitempty"`
}

type ProjectConfig struct {
	Services    []ProjectService    `json:"services"`
	Deployments []ProjectDeployment `json:"deployments"`
}
type FileNode struct {
	UUID     string     `json:"uuid"`
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	IsDir    bool       `json:"is_dir"`
	IsNew    bool       `json:"is_new"`
	Children []FileNode `json:"children,omitempty"`
}

type SaveFileRequest struct {
	ProjectToken     string `json:"projectToken"`
	UserSessionToken string `json:"userSessionToken"`
	Path             string `json:"path"`
	Content          string `json:"content"`
}

type CreateNewDirectoryRequest struct {
	ProjectToken     string `json:"projectToken"`
	UserSessionToken string `json:"userSessionToken"`
	Path             string `json:"path"`
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
