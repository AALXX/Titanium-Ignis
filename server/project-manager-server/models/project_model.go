package models

import (
	"time"
)

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
