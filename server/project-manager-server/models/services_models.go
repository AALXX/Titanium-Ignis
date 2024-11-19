package models

type ServiceRequest struct {
	ProjectToken string `json:"ProjectToken"`
	ServiceName  string `json:"ServiceName"`
}