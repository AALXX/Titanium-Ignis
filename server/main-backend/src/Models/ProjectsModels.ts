export interface IProjectsDb {
    project_name: string;
    project_token: string;
    repo_url: string;
    checked_out_by: string;
    status: string;
    type: string;
}

export interface IProjectsMapped {
    ProjectName: string;
    ProjectToken: string;
    RepoUrl: string;
    CheckedOutBy: string;
    Status: string;
    Type: string;
}