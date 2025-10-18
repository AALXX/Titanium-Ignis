package models

type GenerateRepositoryRequest struct {
	ProjectToken     string `json:"projectToken"`
	UserSessionToken string `json:"userSessionToken"`
}
type CodebaseFormData struct {
	ProjectToken            string  `json:"projectToken" validate:"required"`
	Mode                    string  `json:"mode" validate:"required,oneof=create add"`
	RepositoryName          *string `json:"repositoryName,omitempty"`
	Description             *string `json:"description,omitempty"`
	InitializeWithReadme    *bool   `json:"initializeWithReadme,omitempty"`
	GitignoreTemplate       *string `json:"gitignoreTemplate,omitempty"`
	License                 *string `json:"license,omitempty"`
	RepositoryUrl           *string `json:"repositoryUrl,omitempty"`
	ProjectType             *string `json:"projectType,omitempty"` // "git" | "svn"
	Branch                  *string `json:"branch,omitempty"`
	AuthMethod              *string `json:"authMethod,omitempty"` // "ssh" | "token" | "credentials" | "none"
	AccessToken             *string `json:"accessToken,omitempty"`
	SshKey                  *string `json:"sshKey,omitempty"`
	Username                *string `json:"username,omitempty"`
	AutoSync                *bool   `json:"autoSync,omitempty"`
	SyncInterval            *int    `json:"syncInterval,omitempty"`
	LastUserCommitUserToken string  `json:"lastUserCommitUserToken" validate:"required"`
}
