export interface IProjectConfig {
    services: Array<{
        id: number;
        name: string;
        dir: string;
        'custom-commands': {
            [key: string]: string;
        };
        'start-command': string;
        port: number;
    }>;
}

export interface IProjectsDb {
    project_name: string;
    project_token: string;
    repo_url: string;
    checked_out_by: string;
    status: string;
    type: string;
}

export interface IProjectsResponse {
    ProjectName: string;
    ProjectToken: string;
    RepoUrl: string;
    CheckedOutBy: string;
    Status: string;
    Type: string;
}

export interface IProjectResponse {
    ProjectName: string;
    RepoUrl: string;
    CheckedOutBy: string;
    Status: string;
    Type: string;
}

