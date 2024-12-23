package models
type GenerateRepositoryRequest  struct {
	ProjectToken string `json:"projectToken"`
	UserSessionToken string `json:"userSessionToken"`
}